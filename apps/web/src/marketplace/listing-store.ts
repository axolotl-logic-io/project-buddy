// Marketplace listings: a seller publishes a copy of one of their own
// prompts, of any kind (src/prompts/own-prompt-kinds.ts), with a description and a price in gold, for other
// users to buy (buy-listing.ts). A listing is the copy as last published:
// editing or deleting the seller's prompt changes no listing until the
// seller updates it, which republishes the prompt's current name and
// parts. Only the seller's own work can be listed: not a prompt whose parts
// are still a built-in one's, and not one bought in the Marketplace or
// cloned from one.
//
// Every function takes the acting user first. Every signed-in user may
// read a listed listing, but never its parts, which only a buyer's copy
// shows; only its seller updates or unlists it, or reads it once unlisted.
// Anything else, and any id that is malformed or unknown, is not found.
import { and, desc, eq, isNotNull, type SQL, sql } from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/pg-core";
import { z } from "zod";
import {
  listingListed,
  listingOpenTo,
  listingSoldBy,
  purchaseMadeBy,
  purchaseOfListingSoldBy,
  sellerOfListing,
} from "@/accounts/owner-scope.ts";
import { countListingChange } from "@/accounts/rate-limits.ts";
import {
  parseActivityDefinition,
  storedActivityPrompt,
} from "@/activities/activity-definition.ts";
import {
  parseConstructDefinition,
  storedConstructPrompt,
} from "@/constructs/construct-definition.ts";
import { grantVisualAssets } from "@/constructs/visual-asset-store.ts";
import { getDb, inTransaction } from "@/db/client.ts";
import { listings, purchases } from "@/db/tables/listings.ts";
import { users } from "@/db/tables/users.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import {
  LISTING_ID,
  type ListingId,
  type OwnPromptId,
  parseListingId,
  parseOwnPromptId,
  type UserId,
} from "@/ids.ts";
import {
  type ListingTerms,
  MARKETPLACE_PAGE_SIZE,
} from "@/marketplace/listing.ts";
import { findOwnPrompt } from "@/prompts/own-prompt-kinds.ts";
import {
  type PromptKind,
  STORED_PROMPT_KIND,
  storedPromptKind,
} from "@/prompts/prompt.ts";
import {
  parseSpellDefinition,
  storedSpellPrompt,
} from "@/spells/spell-definition.ts";

// A listing as the Marketplace shows it: never its parts. yours is whether
// the viewer is its seller. sellerName is the seller's name, or undefined
// for a seller with none, never their address.
interface ListingCard {
  readonly id: ListingId;
  readonly kind: PromptKind;
  readonly name: string;
  readonly description: string;
  readonly sellerName: string | undefined;
  readonly price: number;
  readonly listedAt: Date;
  readonly yours: boolean;
}

// A listing as its page shows it to its seller: whether it is still
// listed, and the own prompt it was published from, or undefined once the
// seller has deleted it.
interface SellerView {
  readonly viewer: "seller";
  readonly listed: boolean;
  readonly source: OwnPromptId | undefined;
}

// A listing as its page shows it to anyone else: the copy they bought and
// still have, if any.
interface BuyerView {
  readonly viewer: "buyer";
  readonly copy: OwnPromptId | undefined;
}

type ListingView = ListingCard & (SellerView | BuyerView);

// One of the seller's listings, as their list of them shows it: whether it
// is still listed, how many times it was bought, and the gold it earned.
interface OwnListing {
  readonly id: ListingId;
  readonly kind: PromptKind;
  readonly name: string;
  readonly price: number;
  readonly listed: boolean;
  readonly buyers: number;
  readonly goldEarned: number;
}

// Which listings a page of the Marketplace shows: those of one kind or
// every kind, newest first, from the newest or after the listing with the
// id after, the last one the page before showed.
interface MarketplaceQuery {
  readonly kind?: PromptKind | undefined;
  readonly after?: ListingId | undefined;
}

// The own prompt a listing is published from, as a form names it.
interface ListingSource {
  readonly kind: PromptKind;
  readonly promptId: string;
}

// Why a prompt can't be listed: it isn't the seller's own prompt of the
// kind (or, for an update, the prompt is gone), its parts are still a
// built-in one's, or it was bought or cloned from a bought one.
type Unlistable = "not-found" | "built-in" | "bought";

// What publishing or updating did: published the listing, or refused, for
// one of the reasons a prompt is unlistable, because the seller has deleted
// the prompt a listing they update was published from, or because the
// seller's limit is reached.
type ListingChangeOutcome =
  | { readonly kind: "published"; readonly id: ListingId }
  | { readonly kind: Unlistable | "source-gone" | "limited" };

// A prompt that can be listed: its name and parts, as a listing copies them.
interface Listable {
  readonly name: string;
  readonly parts: unknown;
}

const LISTING_ROW = z.object({
  id: LISTING_ID,
  kind: STORED_PROMPT_KIND,
  name: z.string(),
  description: z.string(),
  sellerId: z.string(),
  sellerName: z.string().nullable(),
  price: z.number(),
  listedAt: z.date(),
  unlistedAt: z.date().nullable(),
  sourceId: z.string(),
});

type ListingRow = z.infer<typeof LISTING_ROW>;

// The listings that match where, newest first, at most limit of them, as
// their cards and pages read them: never their parts. A row that fails
// LISTING_ROW, which only a hand-edited row could, is skipped.
async function readListingRows(
  where: SQL | undefined,
  limit: number,
): Promise<ListingRow[]> {
  const rows = await withAppErrors("read listings", () =>
    getDb()
      .select({
        id: listings.id,
        kind: listings.kind,
        name: listings.name,
        description: listings.description,
        sellerId: listings.sellerId,
        sellerName: users.name,
        price: listings.price,
        listedAt: listings.createdAt,
        unlistedAt: listings.unlistedAt,
        sourceId: listings.sourceId,
      })
      .from(listings)
      .innerJoin(users, sellerOfListing())
      .where(where)
      .orderBy(desc(listings.createdAt), desc(listings.id))
      .limit(limit),
  );
  return rows.flatMap((row) => {
    const parsed = LISTING_ROW.safeParse(row);
    if (!parsed.success) {
      return [];
    }
    return [parsed.data];
  });
}

// The row as the viewer sees it on a card.
function cardOf(viewer: UserId, row: ListingRow): ListingCard {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    description: row.description,
    sellerName: row.sellerName ?? undefined,
    price: row.price,
    listedAt: row.listedAt,
    yours: row.sellerId === viewer,
  };
}

// The seller's own prompt of the kind with this id, as a listing would
// copy it, or why it can't be listed.
async function listableSource(
  seller: UserId,
  { kind, promptId }: ListingSource,
): Promise<Listable | Unlistable> {
  const found = await findOwnPrompt(seller, kind, promptId);
  if (found === undefined) {
    return "not-found";
  }
  if (found.prompt.boughtFrom !== undefined) {
    return "bought";
  }
  if (found.matchesBuiltIn) {
    return "built-in";
  }
  return { name: found.prompt.name, parts: found.prompt.definition };
}

// Publishes the seller's own prompt that source names as a listing with
// these terms, and gives its id. A prompt listed before is republished in
// place, with its current name and parts and these terms, and listed again
// if it was unlisted. A prompt that can't be listed, or a change past the
// seller's limit, publishes nothing.
async function publishListing(
  seller: UserId,
  source: ListingSource,
  terms: ListingTerms,
): Promise<ListingChangeOutcome> {
  const listable = await listableSource(seller, source);
  if (typeof listable === "string") {
    return { kind: listable };
  }
  const sourceId = parseOwnPromptId(source.promptId);
  if (sourceId === undefined) {
    return { kind: "not-found" };
  }
  if (!(await countListingChange(seller, new Date(Date.now())))) {
    return { kind: "limited" };
  }
  const published = {
    name: listable.name,
    parts: listingPayload(source.kind, listable.parts),
    description: terms.description,
    price: terms.price,
  };
  const [row] = await withAppErrors("publish listing", () =>
    inTransaction(async (tx) => {
      const rows = await tx
        .insert(listings)
        .values({
          sellerId: seller,
          sourceId,
          kind: storedPromptKind(source.kind),
          ...published,
        })
        .onConflictDoUpdate({
          target: listings.sourceId,
          set: {
            ...published,
            // Listed again, it is new to the Marketplace: newest first.
            createdAt: sql`case when ${listings.unlistedAt} is null then ${listings.createdAt} else now() end`,
            updatedAt: sql`now()`,
            unlistedAt: null,
          },
          setWhere: listingSoldBy(seller),
        })
        .returning({ id: listings.id });
      const [publishedRow] = rows;
      if (publishedRow !== undefined && source.kind === "construct") {
        await grantVisualAssets(
          seller,
          tx,
          { kind: "listing", id: publishedRow.id },
          { parts: published.parts },
        );
      }
      return rows;
    }),
  );
  const id = parseListingId(row?.id ?? "");
  if (id === undefined) {
    return { kind: "not-found" };
  }
  return { kind: "published", id };
}

// Updates the seller's listed listing with this id: republishes its own
// prompt's current name and parts, with these terms. A listing that isn't
// the seller's or isn't listed is not found; one whose prompt the seller
// has deleted, or that can't be listed now, or a change past the seller's
// limit, changes nothing.
async function updateListing(
  seller: UserId,
  listingId: string,
  terms: ListingTerms,
): Promise<ListingChangeOutcome> {
  const id = parseListingId(listingId);
  if (id === undefined) {
    return { kind: "not-found" };
  }
  const [listing] = await withAppErrors("read listing to update", () =>
    getDb()
      .select({ kind: listings.kind, sourceId: listings.sourceId })
      .from(listings)
      .where(and(eq(listings.id, id), listingSoldBy(seller), listingListed())),
  );
  const kind = STORED_PROMPT_KIND.safeParse(listing?.kind).data;
  if (listing === undefined || kind === undefined) {
    return { kind: "not-found" };
  }
  const outcome = await publishListing(
    seller,
    { kind, promptId: listing.sourceId },
    terms,
  );
  if (outcome.kind === "not-found") {
    return { kind: "source-gone" };
  }
  return outcome;
}

// Unlists the seller's listing with this id, so no one can buy it; its
// buyers keep their copies. True if it was listed; false, changing
// nothing, if it wasn't, or isn't the seller's, or the id is malformed or
// unknown.
async function unlistListing(
  seller: UserId,
  listingId: string,
): Promise<boolean> {
  const id = parseListingId(listingId);
  if (id === undefined) {
    return false;
  }
  const unlisted = await withAppErrors("unlist listing", () =>
    getDb()
      .update(listings)
      .set({ unlistedAt: sql`now()` })
      .where(and(eq(listings.id, id), listingSoldBy(seller), listingListed()))
      .returning({ id: listings.id }),
  );
  return unlisted.length > 0;
}

// The listings a page starts after: those after the listing with the id
// after, newest first, by when each was listed and then by id, compared
// with the database's own values, to the microsecond. A listing the viewer
// may no longer read starts an empty page.
function afterListing(
  viewer: UserId,
  after: ListingId | undefined,
): SQL | undefined {
  if (after === undefined) {
    return undefined;
  }
  return sql`(${listings.createdAt}, ${listings.id}) < (${new QueryBuilder()
    .select({ createdAt: listings.createdAt, id: listings.id })
    .from(listings)
    .where(and(eq(listings.id, after), listingOpenTo(viewer)))})`;
}

// A page of the listed listings, newest first, of the query's kind or
// every kind, at most MARKETPLACE_PAGE_SIZE of them, as the viewer sees
// them.
async function listListings(
  viewer: UserId,
  { kind, after }: MarketplaceQuery,
): Promise<ListingCard[]> {
  let ofKind: SQL | undefined;
  if (kind !== undefined) {
    ofKind = eq(listings.kind, storedPromptKind(kind));
  }
  const rows = await readListingRows(
    and(listingListed(), ofKind, afterListing(viewer, after)),
    MARKETPLACE_PAGE_SIZE,
  );
  return rows.map((row) => cardOf(viewer, row));
}

// The copy of the listing that the viewer bought and still has, if any.
async function heldCopy(
  viewer: UserId,
  listing: ListingId,
): Promise<OwnPromptId | undefined> {
  const [held] = await withAppErrors("read held copy", () =>
    getDb()
      .select({ copyId: purchases.copyId })
      .from(purchases)
      .where(
        and(
          eq(purchases.listingId, listing),
          purchaseMadeBy(viewer),
          isNotNull(purchases.copyId),
        ),
      ),
  );
  return parseOwnPromptId(held?.copyId ?? "");
}

// The listing with this id as its page shows it to the viewer, or
// undefined if it is malformed, unknown, or unlisted and not theirs.
async function getListing(
  viewer: UserId,
  listingId: string,
): Promise<ListingView | undefined> {
  const id = parseListingId(listingId);
  if (id === undefined) {
    return undefined;
  }
  const [row] = await readListingRows(
    and(eq(listings.id, id), listingOpenTo(viewer)),
    1,
  );
  if (row === undefined) {
    return undefined;
  }
  const card = cardOf(viewer, row);
  if (!card.yours) {
    return { ...card, viewer: "buyer", copy: await heldCopy(viewer, id) };
  }
  let sourceId: OwnPromptId | undefined;
  if ((await findOwnPrompt(viewer, row.kind, row.sourceId)) !== undefined) {
    sourceId = parseOwnPromptId(row.sourceId);
  }
  return {
    ...card,
    viewer: "seller",
    listed: row.unlistedAt === null,
    source: sourceId,
  };
}

const OWN_LISTING_ROW = z.object({
  id: LISTING_ID,
  kind: STORED_PROMPT_KIND,
  name: z.string(),
  price: z.number(),
  unlistedAt: z.date().nullable(),
  buyers: z.coerce.number(),
  goldEarned: z.coerce.number(),
});

// The seller's listings, listed or not, newest first, with how many users
// bought each, counting one who bought it again once, and the gold it
// earned.
async function listOwnListings(seller: UserId): Promise<OwnListing[]> {
  const rows = await withAppErrors("list own listings", () =>
    getDb()
      .select({
        id: listings.id,
        kind: listings.kind,
        name: listings.name,
        price: listings.price,
        unlistedAt: listings.unlistedAt,
        buyers: sql<number>`count(distinct ${purchases.buyerId})`,
        goldEarned: sql<number>`coalesce(sum(${purchases.price}), 0)`,
      })
      .from(listings)
      .leftJoin(
        purchases,
        and(
          eq(purchases.listingId, listings.id),
          purchaseOfListingSoldBy(seller),
        ),
      )
      .where(listingSoldBy(seller))
      .groupBy(listings.id)
      .orderBy(desc(listings.createdAt), desc(listings.id)),
  );
  return rows.flatMap((row) => {
    const parsed = OWN_LISTING_ROW.safeParse(row);
    if (!parsed.success) {
      return [];
    }
    const { unlistedAt, ...listing } = parsed.data;
    return [{ ...listing, listed: unlistedAt === null }];
  });
}

// Whether the seller can sell their own prompt that source names: it is
// listed now, as the listing with this id; it can be listed, with the
// terms it had when last unlisted, if it was; or why it can't be. A bought
// prompt can't be listed even if it once was.
type SaleState =
  | { readonly kind: "listed"; readonly listing: ListingId }
  | { readonly kind: "listable"; readonly terms?: ListingTerms | undefined }
  | { readonly kind: Unlistable };

// Sources with active listings of this seller and kind, read in one query.
async function listedPromptIds(
  seller: UserId,
  kind: PromptKind,
): Promise<ReadonlySet<string>> {
  const rows = await withAppErrors("read listed prompt sources", () =>
    getDb()
      .select({ sourceId: listings.sourceId })
      .from(listings)
      .where(
        and(
          listingSoldBy(seller),
          listingListed(),
          eq(listings.kind, storedPromptKind(kind)),
        ),
      ),
  );
  return new Set(rows.map(({ sourceId }) => sourceId));
}

// The seller's own prompt that source names, as SaleState describes it.
async function readSaleState(
  seller: UserId,
  source: ListingSource,
): Promise<SaleState> {
  const promptId = parseOwnPromptId(source.promptId);
  if (promptId === undefined) {
    return { kind: "not-found" };
  }
  const [listable, [row]] = await Promise.all([
    listableSource(seller, source),
    withAppErrors("read prompt's listing", () =>
      getDb()
        .select({
          id: listings.id,
          unlistedAt: listings.unlistedAt,
          description: listings.description,
          price: listings.price,
        })
        .from(listings)
        .where(and(eq(listings.sourceId, promptId), listingSoldBy(seller))),
    ),
  ]);
  const listing = parseListingId(row?.id ?? "");
  if (listable === "bought" || listable === "not-found") {
    return { kind: listable };
  }
  if (listing !== undefined && row?.unlistedAt === null) {
    return { kind: "listed", listing };
  }
  if (listable === "built-in") {
    return { kind: listable };
  }
  if (row === undefined) {
    return { kind: "listable" };
  }
  return {
    kind: "listable",
    terms: { description: row.description, price: row.price },
  };
}

function listingPayload(kind: PromptKind, text: unknown): unknown {
  if (kind === "construct") {
    const parsed = parseConstructDefinition(text);
    if (parsed !== undefined) {
      return storedConstructPrompt(parsed);
    }
  }
  if (kind === "activity") {
    const parsed = parseActivityDefinition(text);
    if (parsed !== undefined) {
      return storedActivityPrompt(parsed);
    }
  }
  if (kind === "spell") {
    const parsed = parseSpellDefinition(text);
    if (parsed !== undefined) {
      return storedSpellPrompt(parsed);
    }
  }
  return text;
}

export type {
  ListingCard,
  ListingChangeOutcome,
  ListingSource,
  ListingView,
  OwnListing,
  SaleState,
  Unlistable,
};
export {
  getListing,
  listedPromptIds,
  listListings,
  listOwnListings,
  publishListing,
  readSaleState,
  unlistListing,
  updateListing,
};
