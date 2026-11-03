// Marketplace listings as the stores give them, for the page tests and
// the phone checks: a long name and description, which must wrap, a seller
// with no name, and the seller's own listings.
import type {
  ListingCard,
  ListingView,
  OwnListing,
} from "@/marketplace/listing-store.ts";
import {
  listingIdFixture,
  userBuddyIdFixture,
} from "../../support/id-fixtures.ts";

const LONG_WORD_REPEATS = 30;
const LONG_WORD = "Woodgrain".repeat(LONG_WORD_REPEATS);
const PRICE = 25;
const SOLD = 3;

// Another user's buddy, listed for 25 gold by a seller with no name, whose
// description holds Markdown and HTML that must show as text.
const BUDDY_LISTING: ListingCard = {
  id: listingIdFixture("6a7b8c9d-0e1f-4a2b-8c3d-4e5f6a7b8c9d"),
  kind: "buddy",
  name: `Woodworker ${LONG_WORD}`,
  description: `A calm buddy for <b>woodworking</b> **projects**. ${LONG_WORD}`,
  sellerName: undefined,
  price: PRICE,
  listedAt: new Date("2026-11-02T09:00:00Z"),
  yours: false,
};

// A free spell, listed by its named seller.
const SPELL_LISTING: ListingCard = {
  id: listingIdFixture("7b8c9d0e-1f2a-4b3c-9d4e-5f6a7b8c9d0e"),
  kind: "spell",
  name: "Ask about the grain",
  description: "Asks one question about the wood before advice.",
  sellerName: "Sam Seller",
  price: 0,
  listedAt: new Date("2026-11-01T09:00:00Z"),
  yours: false,
};

// The buddy listing's page, for a buyer without a copy.
const BUDDY_LISTING_TO_BUY: ListingView = {
  ...BUDDY_LISTING,
  viewer: "buyer",
  copy: undefined,
};

// The buddy listing's page, for its seller, whose prompt is still there.
const BUDDY_LISTING_AS_SELLER: ListingView = {
  ...BUDDY_LISTING,
  yours: true,
  viewer: "seller",
  listed: true,
  source: userBuddyIdFixture("8c9d0e1f-2a3b-4c4d-8e5f-6a7b8c9d0e1f"),
};

// The seller's listings: one listed and sold, one unlisted.
const OWN_LISTINGS: readonly OwnListing[] = [
  {
    id: BUDDY_LISTING.id,
    kind: "buddy",
    name: BUDDY_LISTING.name,
    price: PRICE,
    listed: true,
    timesBought: SOLD,
    goldEarned: SOLD * PRICE,
  },
  {
    id: SPELL_LISTING.id,
    kind: "spell",
    name: SPELL_LISTING.name,
    price: 0,
    listed: false,
    timesBought: 1,
    goldEarned: 0,
  },
];

export {
  BUDDY_LISTING,
  BUDDY_LISTING_AS_SELLER,
  BUDDY_LISTING_TO_BUY,
  OWN_LISTINGS,
  SPELL_LISTING,
};
