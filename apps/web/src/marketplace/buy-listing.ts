// Buying a Marketplace listing (listing-store.ts): the buyer pays its price
// in gold to its seller and gets their own copy of its prompt, an ordinary
// own prompt named as the listing, which remembers the listing it was
// bought from. A free listing moves no gold.
//
// A purchase is one transaction: the payment, the purchase and the copy
// are all saved, or none is. The payment names the purchase as its
// reference, so the transfer moves its gold at most once. A buyer holds at most one copy of a listing,
// so a double submit or a race charges once; once they delete their copy,
// buying it again charges again.
import { and, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { listingBuyableBy, purchaseMadeBy } from "@/accounts/owner-scope.ts";
import { inTransaction, type Transaction } from "@/db/client.ts";
import { listings, purchases } from "@/db/tables/listings.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { transferGold } from "@/gold/gold-store.ts";
import {
  type ListingId,
  type OwnPromptId,
  parseListingId,
  parseOwnPromptId,
  USER_ID,
  type UserId,
} from "@/ids.ts";
import { saveBoughtPrompt } from "@/prompts/own-prompt-store.ts";
import { PROMPT_KINDS, type PromptKind } from "@/prompts/prompt.ts";

// The buyer's copy of a listing: its kind, for its page, and its id.
interface BoughtCopy {
  readonly kind: PromptKind;
  readonly id: OwnPromptId;
}

// What buying did: bought the listing, giving the buyer's new copy; found
// the buyer already holds a copy, giving it; refused, moving nothing,
// because the buyer has less gold than the price (their balance in whole
// gold); or found no listing the buyer may buy: one that is malformed,
// unknown, unlisted or their own.
type BuyOutcome =
  | { readonly kind: "bought" | "held"; readonly copy: BoughtCopy }
  | {
      readonly kind: "too-little-gold";
      readonly price: number;
      readonly gold: number;
    }
  | { readonly kind: "not-found" };

const NOT_FOUND: BuyOutcome = { kind: "not-found" };

const BUYABLE_ROW = z.object({
  sellerId: USER_ID,
  kind: z.enum(PROMPT_KINDS),
  name: z.string(),
  parts: z.unknown(),
  price: z.number(),
});

// Thrown inside the purchase's transaction to roll back everything it did
// and answer with outcome instead.
class Refusal extends Error {
  readonly outcome: BuyOutcome;

  constructor(outcome: BuyOutcome) {
    super(outcome.kind);
    this.outcome = outcome;
  }
}

// The copy of the listing that the buyer already holds, as another
// purchase has just committed it.
async function heldCopy(
  transaction: Transaction,
  buyer: UserId,
  listing: ListingId,
  kind: PromptKind,
): Promise<BuyOutcome> {
  const [held] = await transaction
    .select({ copyId: purchases.copyId })
    .from(purchases)
    .where(
      and(
        eq(purchases.listingId, listing),
        purchaseMadeBy(buyer),
        isNotNull(purchases.copyId),
      ),
    );
  const id = parseOwnPromptId(held?.copyId ?? "");
  if (id === undefined) {
    return NOT_FOUND;
  }
  return { kind: "held", copy: { kind, id } };
}

// The purchase, within its transaction. The listing stays locked until the
// transaction ends, so it can't be unlisted, or its seller deleted, while
// it is bought.
async function purchase(
  transaction: Transaction,
  buyer: UserId,
  listing: ListingId,
): Promise<BuyOutcome> {
  const [row] = await transaction
    .select({
      sellerId: listings.sellerId,
      kind: listings.kind,
      name: listings.name,
      parts: listings.parts,
      price: listings.price,
    })
    .from(listings)
    .where(and(eq(listings.id, listing), listingBuyableBy(buyer)))
    .for("share");
  const buyable = BUYABLE_ROW.safeParse(row);
  if (!buyable.success) {
    return NOT_FOUND;
  }
  const { sellerId, kind, name, parts, price } = buyable.data;
  const copyId = await saveBoughtPrompt(
    transaction,
    buyer,
    { kind, name, parts },
    listing,
  );
  const [bought] = await transaction
    .insert(purchases)
    .values({ listingId: listing, buyerId: buyer, price, copyId })
    .onConflictDoNothing({
      target: [purchases.listingId, purchases.buyerId],
      where: isNotNull(purchases.copyId),
    })
    .returning({ id: purchases.id });
  if (bought === undefined || copyId === undefined) {
    throw new Refusal(await heldCopy(transaction, buyer, listing, kind));
  }
  if (price > 0) {
    const paid = await transferGold(
      buyer,
      {
        payee: sellerId,
        gold: price,
        reason: "marketplace-sale",
        referenceId: bought.id,
      },
      transaction,
    );
    switch (paid.kind) {
      case "notEnoughGold":
        throw new Refusal({ kind: "too-little-gold", price, gold: paid.gold });
      case "noPayee":
        throw new Refusal(NOT_FOUND);
      // The purchase's gold has moved, by this transfer or by one already
      // made with its id, which charges nothing more.
      case "moved":
      case "alreadyMoved":
        break;
      default:
        return paid satisfies never;
    }
  }
  return { kind: "bought", copy: { kind, id: copyId } };
}

// Buys the listing with this id for the buyer, as BuyOutcome describes.
async function buyListing(
  buyer: UserId,
  listingId: string,
): Promise<BuyOutcome> {
  const listing = parseListingId(listingId);
  if (listing === undefined) {
    return NOT_FOUND;
  }
  return await withAppErrors("buy listing", async () => {
    try {
      return await inTransaction((transaction) =>
        purchase(transaction, buyer, listing),
      );
    } catch (error) {
      if (error instanceof Refusal) {
        return error.outcome;
      }
      throw error;
    }
  });
}

export type { BoughtCopy, BuyOutcome };
export { buyListing };
