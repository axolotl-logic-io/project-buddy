"use client";

import {
  type ChangeEvent,
  type JSX,
  type ReactNode,
  useActionState,
  useCallback,
  useState,
} from "react";
import { Button } from "@/components/ui/button.tsx";
import { TextAreaField, TextField } from "@/components/ui/field.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import {
  LISTING_DESCRIPTION_MAX_LENGTH,
  LISTING_PRICE_MAX,
} from "@/marketplace/listing.ts";
import { LISTING_COPY, SELL_COPY } from "@/ui/copy/marketplace.ts";
import type { ListingFormState } from "./actions.ts";

const IDLE: ListingFormState = { kind: "idle" };

// The words of the form's button: as it rests, and while it sends.
interface SubmitWords {
  readonly submit: string;
  readonly pending: string;
}

// A form for a listing's terms, its description and its price, which
// sells an own prompt or updates a listing, as action does; children are
// its hidden fields. Her text stays in the fields whatever the action
// answers, so refused terms can be fixed.
export function ListingTermsForm({
  action,
  words,
  description,
  price,
  children,
}: {
  readonly action: (
    state: ListingFormState,
    formData: FormData,
  ) => Promise<ListingFormState>;
  readonly words: SubmitWords;
  readonly description: string;
  readonly price: number;
  readonly children: ReactNode;
}): JSX.Element {
  const [state, formAction, pending] = useActionState(action, IDLE);
  const [descriptionDraft, setDescriptionDraft] = useState(description);
  const [priceDraft, setPriceDraft] = useState(String(price));
  const updateDescription = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>): void => {
      setDescriptionDraft(event.target.value);
    },
    [],
  );
  const updatePrice = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setPriceDraft(event.target.value);
    },
    [],
  );

  let descriptionError: string | undefined;
  let priceError: string | undefined;
  let formError: string | undefined;
  if (state.kind === "refused") {
    if (state.field === "description") {
      descriptionError = state.message;
    } else if (state.field === "price") {
      priceError = state.message;
    } else {
      formError = state.message;
    }
  }
  let status = "";
  if (state.kind === "updated") {
    status = LISTING_COPY.updated;
  }
  const { submit: resting, pending: sending } = words;
  let submit = resting;
  if (pending) {
    submit = sending;
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {children}
      <TextAreaField
        className="min-h-24"
        error={descriptionError}
        hint={SELL_COPY.descriptionHint(LISTING_DESCRIPTION_MAX_LENGTH)}
        label={SELL_COPY.descriptionLabel}
        maxLength={LISTING_DESCRIPTION_MAX_LENGTH}
        name="description"
        onChange={updateDescription}
        value={descriptionDraft}
      />
      <TextField
        error={priceError}
        hint={SELL_COPY.priceHint(LISTING_PRICE_MAX)}
        inputMode="numeric"
        label={SELL_COPY.priceLabel}
        max={LISTING_PRICE_MAX}
        min={0}
        name="price"
        onChange={updatePrice}
        required={true}
        step={1}
        type="number"
        value={priceDraft}
      />
      {formError !== undefined && <Alert>{formError}</Alert>}
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={pending} type="submit">
          {submit}
        </Button>
        <FormStatus>{status}</FormStatus>
      </div>
    </form>
  );
}
