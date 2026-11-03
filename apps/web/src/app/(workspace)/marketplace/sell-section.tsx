import Link from "next/link";
import type { JSX } from "react";
import type { OwnPromptId } from "@/ids.ts";
import type { SaleState } from "@/marketplace/listing-store.ts";
import type { PromptKind } from "@/prompts/prompt.ts";
import { SELL_COPY } from "@/ui/copy/marketplace.ts";
import { sellListingAction } from "./actions.ts";
import { ListingTermsForm } from "./listing-terms-form.tsx";

const HEADING_ID = "sell-heading";

// What the section says or offers for the prompt's sale state.
function SaleBody({
  kind,
  promptId,
  sale,
}: {
  readonly kind: PromptKind;
  readonly promptId: OwnPromptId;
  readonly sale: SaleState;
}): JSX.Element {
  switch (sale.kind) {
    case "listed":
      return (
        <>
          <p>{SELL_COPY.listed}</p>
          <Link
            className="self-start text-link"
            href={`/marketplace/${sale.listing}`}
          >
            {SELL_COPY.seeListing}
          </Link>
        </>
      );
    case "built-in":
      return <p className="text-muted">{SELL_COPY.builtIn(kind)}</p>;
    case "bought":
      return <p className="text-muted">{SELL_COPY.bought(kind)}</p>;
    case "not-found":
      return <p className="text-muted">{SELL_COPY.notFound}</p>;
    default:
      return (
        <>
          <p className="text-muted">{SELL_COPY.intro(kind)}</p>
          <ListingTermsForm
            action={sellListingAction}
            description={sale.terms?.description ?? ""}
            price={sale.terms?.price ?? 0}
            words={{ submit: SELL_COPY.sell, pending: SELL_COPY.selling }}
          >
            <input name="kind" type="hidden" value={kind} />
            <input name="promptId" type="hidden" value={promptId} />
          </ListingTermsForm>
        </>
      );
  }
}

// "Sell in the Marketplace" on the page of an own prompt of any kind: the
// form that lists it, filled in with its last listing's terms if it was
// unlisted, a link to its listing once listed, or why it can't be sold.
export function SellSection({
  kind,
  promptId,
  sale,
}: {
  readonly kind: PromptKind;
  readonly promptId: OwnPromptId;
  readonly sale: SaleState;
}): JSX.Element {
  return (
    <section aria-labelledby={HEADING_ID} className="panel flex flex-col gap-3">
      <h2 className="section-heading" id={HEADING_ID}>
        {SELL_COPY.heading}
      </h2>
      <SaleBody kind={kind} promptId={promptId} sale={sale} />
    </section>
  );
}
