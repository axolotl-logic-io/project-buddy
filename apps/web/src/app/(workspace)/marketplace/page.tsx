import type { Metadata, Route } from "next";
import Link from "next/link";
import type { JSX } from "react";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { PageWorkspace } from "@/components/page-workspace.tsx";
import { Button } from "@/components/ui/button.tsx";
import { LISTING_ID } from "@/ids.ts";
import { orbPurchasesEnabled } from "@/marketplace/cutover.ts";
import { MARKETPLACE_PAGE_SIZE } from "@/marketplace/listing.ts";
import {
  type ListingCard,
  listListings,
  listOwnListings,
  type OwnListing,
} from "@/marketplace/listing-store.ts";
import { readOrbsBalance } from "@/orbs/orb-store.ts";
import {
  PROMPT_KINDS,
  type PromptKind,
  STORED_PROMPT_KIND,
} from "@/prompts/prompt.ts";
import { MARKETPLACE_COPY, YOUR_LISTINGS_COPY } from "@/ui/copy/marketplace.ts";
import { WORKSPACES_COPY } from "@/ui/copy/workspaces.ts";
import { unlistListingAction } from "./actions.ts";

const LISTINGS_HEADING_ID = "listings-heading";
const YOUR_LISTINGS_ID = "your-listings";
const YOUR_LISTINGS_HEADING_ID = "your-listings-heading";

const QUERY = z.object({
  // Older links name constructs by their stored kind.
  kind: STORED_PROMPT_KIND.optional().catch(undefined),
});
const CURSOR = z.object({ after: LISTING_ID });

// The Marketplace page's address, showing listings of the kind, or every
// kind, from the newest or after a listing it showed.
function marketplacePath(
  kind: PromptKind | undefined,
  after?: ListingCard,
): Route {
  const query = new URLSearchParams();
  if (kind !== undefined) {
    query.set("kind", kind);
  }
  if (after !== undefined) {
    query.set("after", after.id);
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
  yours,
}: {
  readonly shown: PromptKind | undefined;
  readonly yours: boolean;
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
  let ownCurrent: "page" | undefined;
  if (yours) {
    ownCurrent = "page";
  }
  return (
    <nav className="workspace-rail" aria-label={MARKETPLACE_COPY.filterLabel}>
      <ul className="workspace-tablist">
        {choices.map(({ kind, label }) => {
          let current: "page" | undefined;
          if (kind === shown && !yours) {
            current = "page";
          }
          return (
            <li key={label}>
              <Link
                className="workspace-tab"
                aria-current={current}
                href={marketplacePath(kind)}
              >
                {label}
              </Link>
            </li>
          );
        })}
        <li>
          <Link
            className="workspace-tab"
            aria-current={ownCurrent}
            href="/marketplace?view=yours"
          >
            {YOUR_LISTINGS_COPY.heading}
          </Link>
        </li>
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
    after?: string;
    view?: string;
  }>;
}): Promise<JSX.Element> {
  const user = await requireUser();
  const orbs = await readOrbsBalance(user.id);
  const enabled = await orbPurchasesEnabled();
  const query = await searchParams;
  const { kind } = QUERY.parse(query);
  const yours = query.view === "yours";
  const after = CURSOR.safeParse(query).data?.after;
  const [shown, own] = await Promise.all([
    listListings(user.id, { kind, after }),
    listOwnListings(user.id),
  ]);
  const last = shown.at(-1);
  return (
    <PageWorkspace
      title={MARKETPLACE_COPY.heading}
      intro={MARKETPLACE_COPY.intro}
      action={
        <Button asChild={true} variant="secondary">
          <Link href="/workshop">{WORKSPACES_COPY.openWorkshop}</Link>
        </Button>
      }
    >
      <div className="workspace-content flex flex-col gap-2">
        {!enabled && <p role="status">{MARKETPLACE_COPY.paused}</p>}
        <p>{MARKETPLACE_COPY.orbBalance(orbs)}</p>
      </div>
      <KindFilter shown={kind} yours={yours} />
      {!yours && (
        <div className="workspace-content workspace-rows">
          <section
            aria-labelledby={LISTINGS_HEADING_ID}
            className="flex flex-col gap-4"
          >
            <h2 className="section-heading" id={LISTINGS_HEADING_ID}>
              {MARKETPLACE_COPY.listingsHeading}
            </h2>
            {shown.length === 0 && (
              <p className="text-muted">{MARKETPLACE_COPY.empty}</p>
            )}
            {shown.length > 0 && (
              <ul className="flex min-w-0 flex-col gap-3">
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
        </div>
      )}
      {yours && (
        <div className="workspace-content workspace-rows">
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
              <ul className="flex min-w-0 flex-col gap-3">
                {own.map((listing) => (
                  <OwnListingItem key={listing.id} listing={listing} />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </PageWorkspace>
  );
}

export { metadata };
export default MarketplacePage;
