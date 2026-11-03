"use server";

import { refresh } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { buyListing } from "@/marketplace/buy-listing.ts";
import {
  checkListingTerms,
  LISTING_DESCRIPTION_MAX_LENGTH,
  LISTING_PRICE_MAX,
  type ListingTerms,
} from "@/marketplace/listing.ts";
import {
  type ListingChangeOutcome,
  publishListing,
  unlistListing,
  updateListing,
} from "@/marketplace/listing-store.ts";
import { ownPromptPath } from "@/prompts/own-prompt-paths.ts";
import { PROMPT_KINDS, type PromptKind } from "@/prompts/prompt.ts";
import { LISTING_COPY, SELL_COPY } from "@/ui/copy/marketplace.ts";

// A browser sends a textarea's line breaks as CRLF.
const LINE_BREAK = /\r\n?/gu;

const TERMS_FIELDS = {
  description: z.string().transform((text) => text.replace(LINE_BREAK, "\n")),
  price: z.string(),
};

const SELL_FORM = z.object({
  kind: z.enum(PROMPT_KINDS),
  promptId: z.string(),
  ...TERMS_FIELDS,
});

// The listing's kind only words a refusal.
const UPDATE_FORM = z.object({
  listingId: z.string(),
  kind: z.enum(PROMPT_KINDS),
  ...TERMS_FIELDS,
});

const LISTING_FORM = z.object({ listingId: z.string() });

// The state of a form that publishes or updates a listing: as first shown,
// updated, or refused, with the field at fault, if one is, and why.
type ListingFormState =
  | { readonly kind: "idle" | "updated" }
  | {
      readonly kind: "refused";
      readonly field?: "description" | "price";
      readonly message: string;
    };

// The state of a listing's buy form: as first shown, or refused, saying
// why, and whether earning gold would help.
type BuyFormState =
  | { readonly kind: "idle" }
  | {
      readonly kind: "refused";
      readonly message: string;
      readonly earnGold: boolean;
    };

// What a form says when a listing change is refused, for a prompt of the
// kind.
function changeRefusal(
  outcome: Exclude<ListingChangeOutcome["kind"], "published">,
  kind: PromptKind,
): ListingFormState {
  switch (outcome) {
    case "built-in":
      return { kind: "refused", message: SELL_COPY.builtIn(kind) };
    case "bought":
      return { kind: "refused", message: SELL_COPY.bought(kind) };
    case "source-gone":
      return { kind: "refused", message: LISTING_COPY.sourceGone(kind) };
    case "limited":
      return { kind: "refused", message: SELL_COPY.limited };
    default:
      return { kind: "refused", message: SELL_COPY.notFound };
  }
}

// The form's description and price as terms, or what the form says about
// the field at fault.
function termsOf(fields: {
  readonly description: string;
  readonly price: string;
}):
  | { readonly kind: "valid"; readonly terms: ListingTerms }
  | ListingFormState {
  const check = checkListingTerms(fields);
  if (check.kind === "valid") {
    return check;
  }
  if (check.problem === "description-too-long") {
    return {
      kind: "refused",
      field: "description",
      message: SELL_COPY.descriptionTooLong(LISTING_DESCRIPTION_MAX_LENGTH),
    };
  }
  return {
    kind: "refused",
    field: "price",
    message: SELL_COPY.priceInvalid(LISTING_PRICE_MAX),
  };
}

// Publishes her own buddy or activity that the form names as a listing,
// with the form's description and price, then opens the listing's page; or
// says why it can't be listed. A form missing a field is not found.
export async function sellListingAction(
  _state: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const user = await requireUser();
  const form = SELL_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    notFound();
  }
  const terms = termsOf(form.data);
  if (terms.kind !== "valid") {
    return terms;
  }
  const { kind, promptId } = form.data;
  const outcome = await publishListing(
    user.id,
    { kind, promptId },
    terms.terms,
  );
  if (outcome.kind !== "published") {
    return changeRefusal(outcome.kind, kind);
  }
  return redirect(`/marketplace/${outcome.id}`);
}

// Updates her listing that the form names with its prompt's current name
// and parts and the form's description and price, or says why it can't. A
// form missing a field is not found.
export async function updateListingAction(
  _state: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const user = await requireUser();
  const form = UPDATE_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    notFound();
  }
  const terms = termsOf(form.data);
  if (terms.kind !== "valid") {
    return terms;
  }
  const outcome = await updateListing(
    user.id,
    form.data.listingId,
    terms.terms,
  );
  if (outcome.kind !== "published") {
    return changeRefusal(outcome.kind, form.data.kind);
  }
  refresh();
  return { kind: "updated" };
}

// Unlists her listing that the form names, then shows the page again. A
// listing that isn't hers, or isn't listed, changes nothing.
export async function unlistListingAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const form = LISTING_FORM.safeParse(Object.fromEntries(formData));
  if (form.success) {
    await unlistListing(user.id, form.data.listingId);
  }
  refresh();
}

// Buys the listing the form names, then opens the buyer's copy, or the copy
// they already have; or says they have too little gold, or that the
// listing is no longer for sale.
export async function buyListingAction(
  _state: BuyFormState,
  formData: FormData,
): Promise<BuyFormState> {
  const user = await requireUser();
  const form = LISTING_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    notFound();
  }
  const outcome = await buyListing(user.id, form.data.listingId);
  switch (outcome.kind) {
    case "bought":
    case "held":
      return redirect(ownPromptPath(outcome.copy.kind, outcome.copy.id));
    case "too-little-gold":
      return {
        kind: "refused",
        message: LISTING_COPY.tooLittleGold(outcome.price, outcome.gold),
        earnGold: true,
      };
    default:
      refresh();
      return { kind: "refused", message: LISTING_COPY.gone, earnGold: false };
  }
}

export type { BuyFormState, ListingFormState };
