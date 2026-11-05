// The text of the Marketplace: its page, with the listings and the user's
// own, a listing's page, and the form that sells an own buddy, activity or
// spell from its page. Listing text that users write is shown as plain text.
import {
  LISTING_CHANGES_PER_HOUR,
  PURCHASES_PER_HOUR,
} from "@/marketplace/listing.ts";
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

// Who wrote a listing, after its kind.
function by(name: string | undefined): string {
  return `by ${seller(name)}`;
}

// What earning gold takes, which every out-of-gold message links to.
const EARN_GOLD =
  "Earn gold by selling your buddies, activities and spells in the Marketplace.";

// Each kind of prompt, singular and plural.
const KIND_NAMES: Readonly<
  Record<PromptKind, { readonly one: string; readonly many: string }>
> = {
  buddy: { one: "Buddy", many: "Buddies" },
  activity: { one: "Activity", many: "Activities" },
  spell: { one: "Spell", many: "Spells" },
};

// What a copy of each kind holds besides its name, which a listing hides
// until the user has a copy.
const KIND_CONTENTS: Readonly<Record<PromptKind, string>> = {
  buddy: "prompt",
  activity: "prompt and opening request",
  spell: "instructions and when-to-use description",
};

export const MARKETPLACE_COPY = {
  title: pageTitle("Marketplace"),
  headerLink: "Marketplace",
  homeLink: "Home",
  heading: "Marketplace",
  loading: "Loading the Marketplace…",
  intro:
    "Buddies, activities and spells that other users wrote, free or for gold. To sell one of your own, open its page and choose Sell in the Marketplace.",
  filterLabel: "Listing kinds",
  all: "All",
  kinds: KIND_NAMES,
  listingsHeading: "Listings",
  empty: "Nothing is listed here yet.",
  older: "Older listings",
  price,
  seller,
  by,
  // A card's line under its name: its kind and seller, and whether it is
  // the viewer's own.
  cardLine: (
    kind: PromptKind,
    name: string | undefined,
    yours: boolean,
  ): string => {
    const line = `${KIND_NAMES[kind].one} ${by(name)}`;
    if (yours) {
      return `${line} · Your listing`;
    }
    return line;
  },
  earnGold: EARN_GOLD,
} as const;

// The user's own listings, on the Marketplace page.
export const YOUR_LISTINGS_COPY = {
  heading: "Your listings",
  none: "You haven't listed anything yet.",
  // A listing's line under its name: its kind, whether it is listed and at
  // what price, how many users bought it and the gold it earned.
  summary: ({
    kind,
    listed,
    price: gold,
    buyers,
    goldEarned,
  }: {
    readonly kind: PromptKind;
    readonly listed: boolean;
    readonly price: number;
    readonly buyers: number;
    readonly goldEarned: number;
  }): string => {
    let state = "Unlisted";
    if (listed) {
      state = `Listed: ${price(gold)}`;
    }
    let bought = `Bought by ${buyers} users`;
    if (buyers === 1) {
      bought = "Bought by 1 user";
    }
    return `${KIND_NAMES[kind].one} · ${state} · ${bought} · ${goldEarned} gold earned`;
  },
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
    `${KIND_NAMES[kind].one} ${by(name)}`,
  priceLabel: "Price",
  writtenByAnother: (kind: PromptKind): string =>
    `Another user wrote this ${KIND_NAMES[kind].one.toLowerCase()}. Its instructions go to the model in the chats you use it in, and in a team quest's chat they also guide replies to the quest's members. They can't widen what the model reaches: only the quests and chats accessible to the person requesting the reply, including team quests they have joined. You see its ${KIND_CONTENTS[kind]} once it is yours.`,
  buy: (gold: number): string => {
    if (gold === 0) {
      return "Get for free";
    }
    return `Buy for ${gold} gold`;
  },
  buying: "Getting it…",
  tooLittleGold: (needed: number, gold: number): string =>
    `You need ${needed} gold. You have ${gold}.`,
  // The seller changed the price after the page showed it; nothing moved.
  priceChanged: (gold: number): string => {
    if (gold === 0) {
      return "This listing is now free.";
    }
    return `The price is now ${gold} gold.`;
  },
  buyLimited: `Limit reached. You can get up to ${PURCHASES_PER_HOUR} listings an hour. Try again later.`,
  held: (kind: PromptKind): string =>
    `This ${KIND_NAMES[kind].one.toLowerCase()} is yours.`,
  openCopy: (kind: PromptKind): string =>
    `Open your ${KIND_NAMES[kind].one.toLowerCase()}`,
  gone: "This listing isn't for sale any more.",
  // What its seller sees.
  yours: "This is your listing.",
  unlisted:
    "Unlisted: no one can buy it. Buyers keep their copies. To list it again, choose Sell in the Marketplace on its page.",
  unlistedSourceGone: (kind: PromptKind): string =>
    `Unlisted: no one can buy it. Buyers keep their copies. You deleted the ${KIND_NAMES[kind].one.toLowerCase()} it was published from, so it can't be listed again.`,
  sourceGone: (kind: PromptKind): string =>
    `You deleted the ${KIND_NAMES[kind].one.toLowerCase()} this listing was published from. The listing stays as you last published it until you unlist it.`,
  openSource: (kind: PromptKind): string =>
    `Open your ${KIND_NAMES[kind].one.toLowerCase()}`,
  updateHeading: "Update listing",
  updateIntro: (kind: PromptKind): string =>
    `Updating publishes your ${KIND_NAMES[kind].one.toLowerCase()}'s current name and ${KIND_CONTENTS[kind]}, with this description and price. Buyers keep the copies they have.`,
  update: "Update listing",
  updating: "Updating…",
  updated: "Listing updated.",
  unlist: "Unlist",
} as const;

// The form that sells an own buddy, activity or spell, on its page, and what the
// page says when it can't be sold.
export const SELL_COPY = {
  heading: "Sell in the Marketplace",
  intro: (kind: PromptKind): string =>
    `List a copy of this ${KIND_NAMES[kind].one.toLowerCase()} for other users to get. They see its name, your description, your name and the price, and its ${KIND_CONTENTS[kind]} once they have it. Later changes reach the listing only when you update it.`,
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
  limited: `Listing limit reached. You can publish or update up to ${LISTING_CHANGES_PER_HOUR} listings an hour. Try again later.`,
  builtIn: (kind: PromptKind): string =>
    `It still has a built-in ${KIND_NAMES[kind].one.toLowerCase()}'s ${KIND_CONTENTS[kind]}. Edit it to make it your own before you sell it.`,
  bought: (kind: PromptKind): string =>
    `This ${KIND_NAMES[kind].one.toLowerCase()} came from the Marketplace, so you can't sell it.`,
  notFound: "That's no longer here to sell.",
} as const;
