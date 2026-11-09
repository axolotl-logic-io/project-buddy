// A Marketplace listing's terms, which its seller writes: a description,
// shown as plain text, and a price in whole orbs, 0 for a free listing;
// how many listings a page of the Marketplace shows; and the hourly limits
// on changing listings and buying them.
// The browser imports this module for the form's limits, so it imports
// nothing server-only. The listings table's checks hold the same limits.

const LISTING_DESCRIPTION_MAX_LENGTH = 500;
const LISTING_PRICE_MAX = 5;

// The most listings one Marketplace page shows.
const MARKETPLACE_PAGE_SIZE = 30;

// How many listings a user may publish or update, together, in an hour,
// and how many times they may try to buy one.
const LISTING_CHANGES_PER_HOUR = 20;
const PURCHASES_PER_HOUR = 30;

// Digits alone: a whole number of orbs, never negative.
const WHOLE_NUMBER = /^\d+$/u;

// A listing's terms: its description, trimmed, and its price in orbs.
interface ListingTerms {
  readonly description: string;
  readonly price: number;
}

// Why a form's terms are refused: the description is longer than
// LISTING_DESCRIPTION_MAX_LENGTH, or the price isn't a whole number from 0
// to LISTING_PRICE_MAX. Terms with both problems get the first.
type ListingTermsProblem = "description-too-long" | "price-invalid";

// What checkListingTerms found: terms, or why the fields aren't any.
type ListingTermsCheck =
  | { readonly kind: "valid"; readonly terms: ListingTerms }
  | { readonly kind: "refused"; readonly problem: ListingTermsProblem };

// The form's description and price as terms, or why they won't do.
function checkListingTerms(fields: {
  readonly description: string;
  readonly price: string;
}): ListingTermsCheck {
  const description = fields.description.trim();
  if (description.length > LISTING_DESCRIPTION_MAX_LENGTH) {
    return { kind: "refused", problem: "description-too-long" };
  }
  const price = fields.price.trim();
  if (!WHOLE_NUMBER.test(price) || Number(price) > LISTING_PRICE_MAX) {
    return { kind: "refused", problem: "price-invalid" };
  }
  return { kind: "valid", terms: { description, price: Number(price) } };
}

export type { ListingTerms, ListingTermsCheck, ListingTermsProblem };
export {
  checkListingTerms,
  LISTING_CHANGES_PER_HOUR,
  LISTING_DESCRIPTION_MAX_LENGTH,
  LISTING_PRICE_MAX,
  MARKETPLACE_PAGE_SIZE,
  PURCHASES_PER_HOUR,
};
