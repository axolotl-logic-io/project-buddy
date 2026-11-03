import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { BackLink } from "@/components/ui/back-link.tsx";
import { Button } from "@/components/ui/button.tsx";
import { getListing, type ListingView } from "@/marketplace/listing-store.ts";
import { ownPromptPath } from "@/prompts/own-prompt-kinds.ts";
import { LISTING_COPY, MARKETPLACE_COPY } from "@/ui/copy/marketplace.ts";
import { unlistListingAction, updateListingAction } from "../actions.ts";
import { BuyForm } from "../buy-form.tsx";
import { ListingTermsForm } from "../listing-terms-form.tsx";

const UPDATE_HEADING_ID = "update-listing-heading";

// What a buyer can do: open the copy they have, or buy one.
function BuyerPart({
  listing,
}: {
  readonly listing: ListingView & { readonly viewer: "buyer" };
}): JSX.Element {
  if (listing.copy !== undefined) {
    return (
      <div className="flex flex-col gap-3">
        <p>{LISTING_COPY.held(listing.kind)}</p>
        <Button asChild={true} className="self-start" variant="secondary">
          <Link href={ownPromptPath(listing.kind, listing.copy)}>
            {LISTING_COPY.openCopy(listing.kind)}
          </Link>
        </Button>
      </div>
    );
  }
  return <BuyForm listingId={listing.id} price={listing.price} />;
}

// What the seller can do: open the prompt it was published from, update
// the listing from it and unlist it, while each is possible.
function SellerPart({
  listing,
}: {
  readonly listing: ListingView & { readonly viewer: "seller" };
}): JSX.Element {
  if (!listing.listed) {
    return <p>{LISTING_COPY.unlisted}</p>;
  }
  return (
    <>
      <p>{LISTING_COPY.yours}</p>
      {listing.source === undefined && (
        <p>{LISTING_COPY.sourceGone(listing.kind)}</p>
      )}
      {listing.source !== undefined && (
        <section
          aria-labelledby={UPDATE_HEADING_ID}
          className="panel flex flex-col gap-3"
        >
          <h2 className="section-heading" id={UPDATE_HEADING_ID}>
            {LISTING_COPY.updateHeading}
          </h2>
          <p className="text-muted">{LISTING_COPY.updateIntro(listing.kind)}</p>
          <Link
            className="self-start text-link"
            href={ownPromptPath(listing.kind, listing.source)}
          >
            {LISTING_COPY.openSource(listing.kind)}
          </Link>
          <ListingTermsForm
            action={updateListingAction}
            description={listing.description}
            price={listing.price}
            words={{
              submit: LISTING_COPY.update,
              pending: LISTING_COPY.updating,
            }}
          >
            <input name="listingId" type="hidden" value={listing.id} />
            <input name="kind" type="hidden" value={listing.kind} />
          </ListingTermsForm>
        </section>
      )}
      <form action={unlistListingAction}>
        <input name="listingId" type="hidden" value={listing.id} />
        <Button type="submit" variant="secondary">
          {LISTING_COPY.unlist}
        </Button>
      </form>
    </>
  );
}

export const metadata: Metadata = { title: LISTING_COPY.title };

// A listing's page: its name, kind, seller, price and description, never
// its parts; then buying it, or, for its seller, updating and unlisting
// it. An unknown listing, or one unlisted and not hers, is not found.
export default async function ListingPage({
  params,
}: PageProps<"/marketplace/[listingId]">): Promise<JSX.Element> {
  const { listingId } = await params;
  const user = await requireUser();
  const listing = await getListing(user.id, listingId);
  if (listing === undefined) {
    notFound();
  }
  return (
    <>
      <BackLink href="/marketplace">{LISTING_COPY.marketplaceLink}</BackLink>
      <div className="flex flex-col gap-2">
        <h1 className="page-heading wrap-anywhere">{listing.name}</h1>
        <p className="wrap-anywhere text-muted">
          {LISTING_COPY.kindAndSeller(listing.kind, listing.sellerName)}
        </p>
      </div>
      <dl className="flex flex-wrap gap-2">
        <dt className="font-semibold">{LISTING_COPY.priceLabel}</dt>
        <dd>{MARKETPLACE_COPY.price(listing.price)}</dd>
      </dl>
      {listing.description !== "" && (
        <p className="wrap-anywhere whitespace-pre-line">
          {listing.description}
        </p>
      )}
      {listing.viewer === "buyer" && (
        <>
          <p className="text-muted">
            {LISTING_COPY.writtenByAnother(listing.kind)}
          </p>
          <BuyerPart listing={listing} />
        </>
      )}
      {listing.viewer === "seller" && <SellerPart listing={listing} />}
    </>
  );
}
