"use client";

import { type JSX, useActionState } from "react";
import { EarnGoldLink } from "@/components/earn-gold-link.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Alert } from "@/components/ui/form-message.tsx";
import type { ListingId } from "@/ids.ts";
import { LISTING_COPY } from "@/ui/copy/marketplace.ts";
import { type BuyFormState, buyListingAction } from "./actions.ts";

const IDLE: BuyFormState = { kind: "idle" };

// The button that buys a listing at its price, or gets a free one, and
// what went wrong if it couldn't: too little gold, with a link to earning
// more, or a listing no longer for sale.
export function BuyForm({
  listingId,
  price,
}: {
  readonly listingId: ListingId;
  readonly price: number;
}): JSX.Element {
  const [state, formAction, pending] = useActionState(buyListingAction, IDLE);
  let label = LISTING_COPY.buy(price);
  if (pending) {
    label = LISTING_COPY.buying;
  }
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input name="listingId" type="hidden" value={listingId} />
      <input name="price" type="hidden" value={price} />
      <Button className="self-start" disabled={pending} type="submit">
        {label}
      </Button>
      {state.kind === "refused" && (
        <Alert>
          <span>{state.message}</span>
          {state.earnGold === true && <EarnGoldLink marketplace={true} />}
        </Alert>
      )}
    </form>
  );
}
