import type { Metadata, Route } from "next";
import Link from "next/link";
import type { JSX } from "react";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { BackLink } from "@/components/ui/back-link.tsx";
import { Button } from "@/components/ui/button.tsx";
import { LISTING_ID } from "@/ids.ts";
import { MARKETPLACE_PAGE_SIZE } from "@/marketplace/listing.ts";
import {
  type ListingCard,
  listListings,
  listOwnListings,
  type MarketplaceCursor,
  type OwnListing,
} from "@/marketplace/listing-store.ts";
import { PROMPT_KINDS, type PromptKind } from "@/prompts/prompt.ts";
import { HOME_PATH } from "@/routes.ts";
import { MARKETPLACE_COPY, YOUR_LISTINGS_COPY } from "@/ui/copy/marketplace.ts";
import { unlistListingAction } from "./actions.ts";

const LISTINGS_HEADING_ID = "listings-heading";
const YOUR_LISTINGS_ID = "your-listings";
const YOUR_LISTINGS_HEADING_ID = "your-listings-heading";

const QUERY = z.object({
  kind: z.enum(PROMPT_KINDS).optional().catch(undefined),
});
const CURSOR = z.object({ before: z.iso.datetime(), beforeId: LISTING_ID });

// The Marketplace page's address, showing listings of the kind, or every
// kind, from the newest or after a cursor.
function marketplacePath(
  kind: PromptKind | undefined,
  after?: ListingCard,
): Route {
  const query = new URLSearchParams();
  if (kind !== undefined) {
    query.set("kind", kind);
  }
  if (after !== undefined) {
    query.set("before", after.listedAt.toISOString());
    query.set("beforeId", after.id);
  }
  const search = query.toString();
  if (search === "") {
    return "/marketplace";
  }
  return `/marketplace?${search}`;
}

// The kind filter: every kind, or one, as links, the shown one marked.
function KindFilter({
  shown,
}: {
  readonly shown: PromptKind | undefined;
}): JSX.Element {
  const choices: readonly {
    readonly kind: PromptKind | undefined;
    readonly label: string;
  }[] = [
    { kind: undefined, label: MARKETPLACE_COPY.all },
    ...PROMPT_KINDS.map((kind) => ({
      kind,
      label: MARKETPLACE_COPY.kinds[kind].many,
    })),
  ];
  return (
    <nav aria-label={MARKETPLACE_COPY.filterLabel}>
      <ul className="flex flex-wrap gap-2">
        {choices.map(({ kind, label }) => {
          let current: "page" | undefined;
          let variant: "secondary" | "quiet" = "quiet";
          if (kind === shown) {
            current = "page";
            variant = "secondary";
          }
          return (
            <li key={label}>
              <Button asChild={true} variant={variant}>
                <Link aria-current={current} href={marketplacePath(kind)}>
                  {label}
                </Link>
              </Button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// A listing as a card: its name, which links to its page, its kind and
// seller, its price and its description, as plain text.
function ListingCardItem({
  listing,
}: {
  readonly listing: ListingCard;
}): JSX.Element {
  return (
    <li className="card flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Link
          className="card-title wrap-anywhere text-link"
          href={`/marketplace/${listing.id}`}
        >
          {listing.name}
        </Link>
        <span className="font-semibold">
          {MARKETPLACE_COPY.price(listing.price)}
        </span>
      </div>
      <p className="wrap-anywhere text-muted text-sm">
        {MARKETPLACE_COPY.cardLine(
          listing.kind,
          listing.sellerName,
          listing.yours,
        )}
      </p>
      {listing.description !== "" && (
        <p className="wrap-anywhere whitespace-pre-line">
          {listing.description}
        </p>
      )}
    </li>
  );
}

// One of her listings: its name, which links to its page, whether it is
// listed, how often it was bought and what it earned, and its actions.
function OwnListingItem({
  listing,
}: {
  readonly listing: OwnListing;
}): JSX.Element {
  return (
    <li className="card flex min-w-0 flex-col gap-2">
      <Link
        className="card-title wrap-anywhere text-link"
        href={`/marketplace/${listing.id}`}
      >
        {listing.name}
      </Link>
      <p className="text-muted text-sm">
        {YOUR_LISTINGS_COPY.summary(listing)}
      </p>
      {listing.listed === true && (
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild={true} variant="quiet">
            <Link
              aria-label={YOUR_LISTINGS_COPY.updateLabel(listing.name)}
              href={`/marketplace/${listing.id}`}
            >
              {YOUR_LISTINGS_COPY.update}
            </Link>
          </Button>
          <form action={unlistListingAction}>
            <input name="listingId" type="hidden" value={listing.id} />
            <Button
              aria-label={YOUR_LISTINGS_COPY.unlistLabel(listing.name)}
              type="submit"
              variant="quiet"
            >
              {YOUR_LISTINGS_COPY.unlist}
            </Button>
          </form>
        </div>
      )}
    </li>
  );
}

const metadata: Metadata = { title: MARKETPLACE_COPY.title };

// The Marketplace: the listed prompts of every kind, newest first, of one
// kind or every kind, a page at a time; then her own listings.
async function MarketplacePage({
  searchParams,
}: {
  readonly searchParams: Promise<{
    kind?: string;
    before?: string;
    beforeId?: string;
  }>;
}): Promise<JSX.Element> {
  const user = await requireUser();
  const query = await searchParams;
  const { kind } = QUERY.parse(query);
  const cursor = CURSOR.safeParse(query).data;
  let after: MarketplaceCursor | undefined;
  if (cursor !== undefined) {
    after = { listedAt: new Date(cursor.before), id: cursor.beforeId };
  }
  const [shown, own] = await Promise.all([
    listListings(user.id, { kind, after }),
    listOwnListings(user.id),
  ]);
  const last = shown.at(-1);
  return (
    <>
      <BackLink href={HOME_PATH}>{MARKETPLACE_COPY.homeLink}</BackLink>
      <h1 className="page-heading">{MARKETPLACE_COPY.heading}</h1>
      <p className="text-muted">{MARKETPLACE_COPY.intro}</p>
      <section
        aria-labelledby={LISTINGS_HEADING_ID}
        className="flex flex-col gap-4"
      >
        <h2 className="section-heading" id={LISTINGS_HEADING_ID}>
          {MARKETPLACE_COPY.listingsHeading}
        </h2>
        <KindFilter shown={kind} />
        {shown.length === 0 && (
          <p className="text-muted">{MARKETPLACE_COPY.empty}</p>
        )}
        {shown.length > 0 && (
          <ul className="grid min-w-0 gap-3 sm:grid-cols-2">
            {shown.map((listing) => (
              <ListingCardItem key={listing.id} listing={listing} />
            ))}
          </ul>
        )}
        {shown.length === MARKETPLACE_PAGE_SIZE && last !== undefined && (
          <Link
            className="self-start text-link"
            href={marketplacePath(kind, last)}
          >
            {MARKETPLACE_COPY.older}
          </Link>
        )}
      </section>
      <section
        aria-labelledby={YOUR_LISTINGS_HEADING_ID}
        className="flex flex-col gap-4"
        id={YOUR_LISTINGS_ID}
      >
        <h2 className="section-heading" id={YOUR_LISTINGS_HEADING_ID}>
          {YOUR_LISTINGS_COPY.heading}
        </h2>
        {own.length === 0 && (
          <p className="text-muted">{YOUR_LISTINGS_COPY.none}</p>
        )}
        {own.length > 0 && (
          <ul className="grid min-w-0 gap-3 sm:grid-cols-2">
            {own.map((listing) => (
              <OwnListingItem key={listing.id} listing={listing} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export { metadata };
export default MarketplacePage;
