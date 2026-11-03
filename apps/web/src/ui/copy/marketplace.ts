// The text of the Marketplace: its page, with the listings and the user's
// own, a listing's page, and the form that sells an own buddy or activity
// from its page. Listing text that users write is shown as plain text.
import type { PromptKind } from "@/prompts/prompt.ts";
import { pageTitle, SITE_COPY } from "@/ui/copy/site.ts";

// A price as a listing shows it: "Free", or the gold it costs.
function price(gold: number): string {
  if (gold === 0) {
    return "Free";
  }
  return `${gold} gold`;
}

// A seller as a listing names them: their name, or a stand-in for someone
// with none. Never their email address.
function seller(name: string | undefined): string {
  return name ?? `A ${SITE_COPY.name} user`;
}

// What earning gold takes, which every out-of-gold message links to.
const EARN_GOLD = "Earn gold by selling your buddies and activities";

// Each kind of prompt, singular and plural.
const KIND_NAMES: Readonly<
  Record<PromptKind, { readonly one: string; readonly many: string }>
> = {
  buddy: { one: "Buddy", many: "Buddies" },
  activity: { one: "Activity", many: "Activities" },
};

export const MARKETPLACE_COPY = {
  title: pageTitle("Marketplace"),
  headerLink: "Marketplace",
  homeLink: "Home",
  heading: "Marketplace",
  loading: "Loading the Marketplace…",
  intro:
    "Buddies and activities that other users wrote, free or for gold. To sell one of your own, open its page and choose Sell in the Marketplace.",
  filterLabel: "Show",
  all: "All",
  kinds: KIND_NAMES,
  listingsHeading: "Listings",
  empty: "Nothing is listed here yet.",
  older: "Older listings",
  price,
  seller,
  by: (name: string | undefined): string => `by ${seller(name)}`,
  yours: "Your listing",
  earnGold: EARN_GOLD,
} as const;

// The user's own listings, on the Marketplace page.
export const YOUR_LISTINGS_COPY = {
  heading: "Your listings",
  none: "You haven't listed anything yet.",
  listed: (gold: number): string => `Listed: ${price(gold)}`,
  unlisted: "Unlisted",
  timesBought: (times: number): string => {
    if (times === 1) {
      return "Bought once";
    }
    return `Bought ${times} times`;
  },
  goldEarned: (gold: number): string => `${gold} gold earned`,
  update: "Update listing",
  updateLabel: (name: string): string => `Update the listing of ${name}`,
  unlist: "Unlist",
  unlistLabel: (name: string): string => `Unlist ${name}`,
} as const;

// A listing's page: what anyone sees, what a buyer does, and what its
// seller does.
export const LISTING_COPY = {
  title: pageTitle("Listing"),
  marketplaceLink: "Marketplace",
  loading: "Loading the listing…",
  kindAndSeller: (kind: PromptKind, name: string | undefined): string =>
    `${KIND_NAMES[kind].one} ${MARKETPLACE_COPY.by(name)}`,
  priceLabel: "Price",
  writtenByAnother: (kind: PromptKind): string =>
    `Another user wrote this ${KIND_NAMES[kind].one.toLowerCase()}. Its instructions go to the model in your chats, which can still reach only your own projects and chats. You see its parts once it is yours.`,
  buy: (gold: number): string => {
    if (gold === 0) {
      return "Get for free";
    }
    return `Buy for ${gold} gold`;
  },
  buying: "Getting it…",
  tooLittleGold: (needed: number, gold: number): string =>
    `You need ${needed} gold. You have ${gold}.`,
  earnGold: EARN_GOLD,
  held: (kind: PromptKind): string =>
    `This ${KIND_NAMES[kind].one.toLowerCase()} is yours.`,
  openCopy: (kind: PromptKind): string =>
    `Open your ${KIND_NAMES[kind].one.toLowerCase()}`,
  gone: "This listing isn't for sale any more.",
  // What its seller sees.
  yours: "This is your listing.",
  unlisted:
    "Unlisted: no one can buy it. Buyers keep their copies. To list it again, choose Sell in the Marketplace on its page.",
  sourceGone: (kind: PromptKind): string =>
    `You deleted the ${KIND_NAMES[kind].one.toLowerCase()} this listing was published from. The listing stays as you last published it until you unlist it.`,
  openSource: (kind: PromptKind): string =>
    `Open your ${KIND_NAMES[kind].one.toLowerCase()}`,
  updateHeading: "Update listing",
  updateIntro: (kind: PromptKind): string =>
    `Updating publishes your ${KIND_NAMES[kind].one.toLowerCase()}'s current name and parts, with this description and price. Buyers keep the copies they have.`,
  update: "Update listing",
  updating: "Updating…",
  updated: "Listing updated.",
  unlist: "Unlist",
} as const;

// The form that sells an own buddy or activity, on its page, and what the
// page says when it can't be sold.
export const SELL_COPY = {
  heading: "Sell in the Marketplace",
  intro: (kind: PromptKind): string =>
    `List a copy of this ${KIND_NAMES[kind].one.toLowerCase()} for other users to get. They see its name, your description, your name and the price, and its parts once they have it. Later changes reach the listing only when you update it.`,
  descriptionLabel: "Description",
  descriptionHint: (max: number): string =>
    `What it does and who it suits, as plain text, up to ${max} characters.`,
  priceLabel: "Price in gold",
  priceHint: (max: number): string =>
    `A whole number from 0 to ${max}. 0 lists it for free.`,
  sell: "Sell in the Marketplace",
  selling: "Listing…",
  listed: "Listed in the Marketplace.",
  seeListing: "See your listing",
  descriptionTooLong: (max: number): string =>
    `Make the description ${max} characters or fewer.`,
  priceInvalid: (max: number): string =>
    `Enter a whole number of gold from 0 to ${max}.`,
  limited:
    "Listing limit reached. You can publish or update up to 20 listings an hour. Try again later.",
  builtIn: (kind: PromptKind): string =>
    `Its parts are still a built-in ${KIND_NAMES[kind].one.toLowerCase()}'s. Change them to make it your own before you sell it.`,
  bought: (kind: PromptKind): string =>
    `This ${KIND_NAMES[kind].one.toLowerCase()} came from the Marketplace, so you can't sell it.`,
  notFound: "That's no longer here to sell.",
} as const;
