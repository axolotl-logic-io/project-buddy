// The Marketplace against the test database: selling an own buddy,
// activity or spell from its page, what other users see of a listing,
// buying it for gold or for free, and the seller's listings, with real
// users, sessions and gold.

import { eq, sql } from "drizzle-orm";
import { describe, expect, test, vi } from "vitest";
import { saveUserName, type User } from "@/accounts/users-store.ts";
import {
  cloneActivity,
  getOwnActivity,
  updateActivity,
} from "@/activities/activity-store.ts";
import { resetActivityPromptAction } from "@/app/(workspace)/activities/actions.ts";
import { resetBuddyPromptAction } from "@/app/(workspace)/buddies/actions.ts";
import {
  buyListingAction,
  sellListingAction,
  unlistListingAction,
  updateListingAction,
} from "@/app/(workspace)/marketplace/actions.ts";
import { resetSpellPromptAction } from "@/app/(workspace)/spellbook/actions.ts";
import {
  cloneBuddy,
  deleteBuddy,
  getOwnBuddy,
  listBuddies,
  updateBuddy,
} from "@/buddies/buddy-store.ts";
import { getDb } from "@/db/client.ts";
import { goldBalances } from "@/db/tables/gold.ts";
import { listings } from "@/db/tables/listings.ts";
import { wholeGold } from "@/gold/gold.ts";
import { chargeGold, readGoldBalance } from "@/gold/gold-store.ts";
import type { ListingId } from "@/ids.ts";
import { type BuyOutcome, buyListing } from "@/marketplace/buy-listing.ts";
import { PURCHASES_PER_HOUR } from "@/marketplace/listing.ts";
import {
  getListing,
  listedPromptIds,
  listListings,
  listOwnListings,
  publishListing,
  readSaleState,
  unlistListing,
  updateListing,
} from "@/marketplace/listing-store.ts";
import { PROMPT_KINDS, type PromptKind } from "@/prompts/prompt.ts";
import { SPELL_TEXT_MAX } from "@/spells/spell.ts";
import {
  cloneSpell,
  getOwnSpell,
  listOwnSpells,
  updateSpell,
} from "@/spells/spell-store.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import {
  expectNotFound,
  expectRedirect,
} from "../test-database/navigation-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";
import { deleteAccount } from "../test-database/two-users-test-kit.ts";

vi.mock("next/cache", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/cache")>()),
  refresh: (): void => {
    // The page a Server Action refreshes isn't there in a server test.
  },
}));

// Gold in micro-USD, as balances are stored.
const MICRO_USD_PER_GOLD = 10_000;
const STARTING_GOLD = 100;
const PRICE = 25;
const SHORT_GOLD = 12;
const DESCRIPTION_MAX = 500;
const PRICE_MAX = 10_000;
const CHANGES_PER_HOUR = 20;
// Two buys of 60 with 100 gold: only one can be paid.
const RACING_PRICE = 60;
const BUYS_AT_ONCE = 4;
const CALL_COST_MICRO_USD = 300_000;
const RAISED_PRICE = 90;
// Each race of a purchase and its seller's deletion has two outcomes;
// enough of them that a lock-order deadlock would show.
const SELLER_DELETION_RACES = 8;
const SELLER_NAME = "Sam Seller";
const VOICE = "## Voice\n\nA patient woodworker who talks in short sentences.";
const DESCRIPTION = "A calm buddy for <b>woodworking</b> **projects**.";

// A form's fields, as the browser sends them.
function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

// A buddy of the user's own whose voice is their own work, not a built-in
// one's.
async function ownBuddy(user: User, name = "Woodworker"): Promise<string> {
  const clone = await cloneBuddy(user.id, "hippy");
  if (clone === undefined) {
    throw new Error("Hippy could not be cloned");
  }
  await updateBuddy(user.id, clone.id, {
    name,
    definition: { ...clone.definition, prompt: VOICE },
  });
  return clone.id;
}

// An own prompt of each kind, each changed from its built-in one.
async function ownPromptOf(user: User, kind: PromptKind): Promise<string> {
  if (kind === "buddy") {
    return await ownBuddy(user);
  }
  if (kind === "activity") {
    const clone = await cloneActivity(user.id, "brainstorming");
    if (clone === undefined) {
      throw new Error("Brainstorming could not be cloned");
    }
    await updateActivity(user.id, clone.id, {
      definition: { ...clone.definition, prompt: "Brainstorm birdhouses." },
    });
    return clone.id;
  }
  const clone = await cloneSpell(user.id, "ask-one-question");
  if (clone === undefined) {
    throw new Error("The spell could not be cloned");
  }
  await updateSpell(user.id, clone.id, {
    definition: { ...clone.definition, prompt: "Ask about wood grain." },
  });
  return clone.id;
}

// The listing of the seller's buddy, published straight in the store.
async function listed(
  seller: User,
  promptId: string,
  price = PRICE,
  kind: PromptKind = "buddy",
): Promise<ListingId> {
  const outcome = await publishListing(
    seller.id,
    { kind, promptId },
    { description: DESCRIPTION, price },
  );
  if (outcome.kind !== "published") {
    throw new Error(`The listing was refused: ${outcome.kind}`);
  }
  return outcome.id;
}

// Buys the listing for the user at the price its page shows them, as the
// buy form sends it; 0 for a listing they can't see.
async function buyAsShown(user: User, listing: string): Promise<BuyOutcome> {
  const shown = await getListing(user.id, listing);
  return await buyListing(user.id, {
    listingId: listing,
    price: shown?.price ?? 0,
  });
}

// Sets when the listing was listed, to the microsecond, which only the
// database writes, so this names the table.
async function setListedAt(listing: string, at: string): Promise<void> {
  await getDb()
    .update(listings)
    .set({ createdAt: sql`${at}::timestamptz` })
    .where(eq(listings.id, listing));
}

// The user's gold as they see it.
async function goldOf(user: User): Promise<number> {
  return wholeGold(await readGoldBalance(user.id));
}

// Sets the user's gold, which the site only changes by spending and
// transfers, so this names the table.
async function setGold(user: User, gold: number): Promise<void> {
  await readGoldBalance(user.id);
  await getDb()
    .update(goldBalances)
    .set({ microUsd: gold * MICRO_USD_PER_GOLD })
    .where(eq(goldBalances.userId, user.id));
}

// Sells the seller's own prompt of the kind from its page, checks the site
// opened the listing it published, and gives the prompt's id and the
// listing as its seller sees it.
async function sellFromPage(
  seller: User,
  kind: PromptKind,
): Promise<{ readonly promptId: string; readonly listing: unknown }> {
  const promptId = await ownPromptOf(seller, kind);
  const selling = sellListingAction(
    { kind: "idle" },
    form({ kind, promptId, description: DESCRIPTION, price: "25" }),
  );
  await Promise.allSettled([selling]);
  const sale = await readSaleState(seller.id, { kind, promptId });
  if (sale.kind !== "listed") {
    throw new Error(`The ${kind} was not listed`);
  }
  await expectRedirect(() => selling, `/marketplace/${sale.listing}`);
  return { promptId, listing: await getListing(seller.id, sale.listing) };
}

// Gets the free listing for the user, then deletes their copy.
async function getAndDelete(user: User, listing: string): Promise<void> {
  const bought = await buyAsShown(user, listing);
  if (bought.kind !== "bought") {
    throw new Error("The free listing was not got");
  }
  await deleteBuddy(user.id, bought.copy.id);
}

// What a purchase raced against its seller's deletion left: whether the
// deletion went through, and whether the buyer has either the copy and the
// price taken, or neither.
async function buyWhileSellerGoes(): Promise<{
  readonly deleted: boolean;
  readonly consistent: boolean;
}> {
  const [seller, buyer] = await Promise.all([testUser(), testUser()]);
  const listing = await listed(seller, await ownBuddy(seller));
  const [bought, deleted] = await Promise.allSettled([
    buyListing(buyer.id, { listingId: listing, price: PRICE }),
    deleteAccount(seller),
  ]);
  const [copies, gold] = await Promise.all([
    listBuddies(buyer.id),
    goldOf(buyer),
  ]);
  const paid =
    bought.status === "fulfilled" &&
    bought.value.kind === "bought" &&
    copies.length === 1 &&
    gold === STARTING_GOLD - PRICE;
  const refused =
    bought.status === "fulfilled" &&
    bought.value.kind === "not-found" &&
    copies.length === 0 &&
    gold === STARTING_GOLD;
  return {
    deleted: deleted.status === "fulfilled",
    consistent: paid || refused,
  };
}

describe("use_case_sell_in_marketplace", () => {
  test("selling an own buddy, activity or spell publishes a listing and opens it", async () => {
    const seller = await testUser();
    await signIn(seller);
    const sold = await Promise.all(
      PROMPT_KINDS.map((kind) => sellFromPage(seller, kind)),
    );
    expect(sold).toEqual(
      PROMPT_KINDS.map((kind, index) => ({
        promptId: sold[index]?.promptId,
        listing: expect.objectContaining({
          kind,
          description: DESCRIPTION,
          price: PRICE,
          viewer: "seller",
          listed: true,
          source: sold[index]?.promptId,
        }),
      })),
    );
  });

  test("terms out of bounds list nothing and say which field to fix", async () => {
    const seller = await testUser();
    await signIn(seller);
    const promptId = await ownBuddy(seller);
    function sell(description: string, price: string): Promise<unknown> {
      return sellListingAction(
        { kind: "idle" },
        form({ kind: "buddy", promptId, description, price }),
      );
    }

    expect(await sell("x".repeat(DESCRIPTION_MAX + 1), "0")).toMatchObject({
      kind: "refused",
      field: "description",
    });
    const prices = ["-1", "2.5", "", "ten", String(PRICE_MAX + 1)];
    expect(await Promise.all(prices.map((price) => sell("", price)))).toEqual(
      prices.map(() =>
        expect.objectContaining({ kind: "refused", field: "price" }),
      ),
    );
    expect(await readSaleState(seller.id, { kind: "buddy", promptId })).toEqual(
      { kind: "listable" },
    );
  });

  test("a renamed copy of a built-in prompt, a bought prompt and its clones can't be listed", async () => {
    const [seller, buyer] = await Promise.all([testUser(), testUser()]);
    const renamed = await cloneBuddy(seller.id, "mr-tee");
    if (renamed === undefined) {
      throw new Error("Mr. Tee could not be cloned");
    }
    await updateBuddy(seller.id, renamed.id, { name: "Coach" });
    const terms = { description: "", price: 0 };
    expect(
      await publishListing(
        seller.id,
        { kind: "buddy", promptId: renamed.id },
        terms,
      ),
    ).toEqual({ kind: "built-in" });

    const listing = await listed(seller, await ownBuddy(seller), 0);
    const bought = await buyAsShown(buyer, listing);
    if (bought.kind !== "bought") {
      throw new Error("The free listing was not bought");
    }
    const clone = await cloneBuddy(buyer.id, bought.copy.id);
    if (clone === undefined) {
      throw new Error("The bought buddy could not be cloned");
    }
    const cloneOfClone = await cloneBuddy(buyer.id, clone.id);
    if (cloneOfClone === undefined) {
      throw new Error("The clone could not be cloned");
    }
    await updateBuddy(buyer.id, cloneOfClone.id, {
      name: "Mine now",
      definition: {
        ...cloneOfClone.definition,
        prompt: "## Voice\n\nRewritten.",
      },
    });
    expect(cloneOfClone.boughtFrom).toBe(listing);
    expect(
      await Promise.all(
        [bought.copy.id, clone.id, cloneOfClone.id].map((promptId) =>
          publishListing(buyer.id, { kind: "buddy", promptId }, terms),
        ),
      ),
    ).toEqual([{ kind: "bought" }, { kind: "bought" }, { kind: "bought" }]);
  });

  test("another user's prompt can't be listed by them", async () => {
    const [seller, other] = await Promise.all([testUser(), testUser()]);
    const promptId = await ownBuddy(seller);
    expect(
      await publishListing(
        other.id,
        { kind: "buddy", promptId },
        { description: "", price: 0 },
      ),
    ).toEqual({ kind: "not-found" });
  });

  test("publishing and updating more than 20 times an hour is refused", async () => {
    const seller = await testUser();
    const promptId = await ownBuddy(seller);
    const listing = await listed(seller, promptId);
    // Publishing counted once; these count the rest of the hour's 20.
    const changes = Array.from(
      { length: CHANGES_PER_HOUR - 1 },
      (_, change) => `Change ${change}`,
    );
    expect(
      await Promise.all(
        changes.map((description) =>
          updateListing(seller.id, listing, { description, price: PRICE }),
        ),
      ),
    ).toEqual(changes.map(() => ({ kind: "published", id: listing })));
    expect(
      await updateListing(seller.id, listing, {
        description: "One too many",
        price: PRICE,
      }),
    ).toEqual({ kind: "limited" });
    expect(changes).toContain(
      (await getListing(seller.id, listing))?.description,
    );
  });
});

test("active spell listing sources are scoped to seller and kind", async () => {
  const [seller, other] = await Promise.all([testUser(), testUser()]);
  const source = await ownPromptOf(seller, "spell");
  const listing = await listed(seller, source, 0, "spell");
  await listed(seller, await ownBuddy(seller));
  await listed(other, await ownPromptOf(other, "spell"), 0, "spell");
  expect(await listedPromptIds(seller.id, "spell")).toEqual(new Set([source]));
  await unlistListing(seller.id, listing);
  expect(await listedPromptIds(seller.id, "spell")).toEqual(new Set());
});

describe("use_case_browse_marketplace", () => {
  test("listings show newest first, by kind, with the seller's name and never the parts", async () => {
    const [seller, viewer] = await Promise.all([testUser(), testUser()]);
    await saveUserName(seller.id, SELLER_NAME);
    const buddy = await listed(seller, await ownBuddy(seller));
    const spell = await listed(
      seller,
      await ownPromptOf(seller, "spell"),
      0,
      "spell",
    );

    const shown = (await listListings(viewer.id, {})).filter(({ id }) =>
      [buddy, spell].includes(id),
    );
    expect(shown.map(({ id }) => id)).toEqual([spell, buddy]);
    expect(shown[1]).toEqual({
      id: buddy,
      kind: "buddy",
      name: "Woodworker",
      description: DESCRIPTION,
      sellerName: SELLER_NAME,
      price: PRICE,
      listedAt: expect.any(Date),
      yours: false,
    });
    const spells = await listListings(viewer.id, { kind: "spell" });
    expect(spells.map(({ id }) => id)).toContain(spell);
    expect(spells.map(({ id }) => id)).not.toContain(buddy);

    const page = await getListing(viewer.id, buddy);
    expect(page).toMatchObject({ viewer: "buyer", copy: undefined });
    expect(JSON.stringify(page)).not.toContain("woodworker who talks");
    expect(JSON.stringify(shown)).not.toContain("woodworker who talks");
    expect(JSON.stringify(shown)).not.toContain(seller.email);
  });

  test("a seller with no name has none, and an unlisted listing is hidden from everyone else", async () => {
    const [seller, viewer] = await Promise.all([testUser(), testUser()]);
    const listing = await listed(seller, await ownBuddy(seller));
    expect(await getListing(viewer.id, listing)).toMatchObject({
      sellerName: undefined,
    });

    expect(await unlistListing(seller.id, listing)).toBe(true);
    expect(await getListing(viewer.id, listing)).toBeUndefined();
    const shown = await listListings(viewer.id, {});
    expect(shown.map(({ id }) => id)).not.toContain(listing);
    expect(await getListing(seller.id, listing)).toMatchObject({
      listed: false,
    });
  });

  test("a page after a listing keeps the listings listed in the same millisecond", async () => {
    const seller = await testUser();
    const [newer, older] = await Promise.all([
      listed(seller, await ownBuddy(seller, "Newer")),
      listed(seller, await ownBuddy(seller, "Older")),
    ]);
    // Later than any other test's listings, a tenth of a millisecond apart,
    // as the database keeps them, so they head the Marketplace.
    await Promise.all([
      setListedAt(newer, "2999-01-01T00:00:00.000200Z"),
      setListedAt(older, "2999-01-01T00:00:00.000100Z"),
    ]);

    const first = await listListings(seller.id, {});
    expect(first.slice(0, 2).map(({ id }) => id)).toEqual([newer, older]);
    const next = await listListings(seller.id, { after: newer });
    expect(next[0]?.id).toBe(older);
  });

  test("listing again puts a listing back at the top, with its last terms filled in to sell", async () => {
    const seller = await testUser();
    const promptId = await ownBuddy(seller);
    const listing = await listed(seller, promptId);
    await setListedAt(listing, "2001-01-01T00:00:00Z");
    await unlistListing(seller.id, listing);

    expect(await readSaleState(seller.id, { kind: "buddy", promptId })).toEqual(
      {
        kind: "listable",
        terms: { description: DESCRIPTION, price: PRICE },
      },
    );
    expect(await listed(seller, promptId)).toBe(listing);
    const relisted = await getListing(seller.id, listing);
    expect(relisted?.listedAt.getFullYear()).toBe(new Date().getFullYear());
    const updated = await updateListing(seller.id, listing, {
      description: "",
      price: PRICE,
    });
    expect(updated).toEqual({ kind: "published", id: listing });
    expect((await getListing(seller.id, listing))?.listedAt).toEqual(
      relisted?.listedAt,
    );
  });
});

describe("use_case_buy_listing", () => {
  test.each(PROMPT_KINDS)(
    "a bought %s and its clone cannot lose purchased instructions through reset",
    async (kind) => {
      const [seller, buyer] = await Promise.all([testUser(), testUser()]);
      const listing = await listed(
        seller,
        await ownPromptOf(seller, kind),
        PRICE,
        kind,
      );
      const outcome = await buyAsShown(buyer, listing);
      if (outcome.kind !== "bought") {
        throw new Error("Buying saved no copy");
      }
      await signIn(buyer);
      const stores = {
        buddy: {
          read: getOwnBuddy,
          clone: cloneBuddy,
          reset: resetBuddyPromptAction,
          field: "buddyId",
        },
        activity: {
          read: getOwnActivity,
          clone: cloneActivity,
          reset: resetActivityPromptAction,
          field: "activityId",
        },
        spell: {
          read: getOwnSpell,
          clone: cloneSpell,
          reset: resetSpellPromptAction,
          field: "spellId",
        },
      };
      const store = stores[kind];
      const original = await store.read(buyer.id, outcome.copy.id);
      const clone = await store.clone(buyer.id, outcome.copy.id);
      if (original === undefined || clone === undefined) {
        throw new Error("Bought copy could not be read or cloned");
      }
      await Promise.all(
        [original, clone].map(async (copy) => {
          await expectNotFound(() =>
            store.reset(form({ [store.field]: copy.id })),
          );
          expect((await store.read(buyer.id, copy.id))?.definition).toEqual(
            original.definition,
          );
        }),
      );
    },
  );

  test("buying moves the price to the seller and opens the buyer's own copy", async () => {
    const [seller, buyer] = await Promise.all([testUser(), testUser()]);
    await signIn(buyer);
    const listing = await listed(seller, await ownBuddy(seller));

    const buying = buyListingAction(
      { kind: "idle" },
      form({ listingId: listing, price: String(PRICE) }),
    );
    await Promise.allSettled([buying]);
    const [copy] = await listBuddies(buyer.id);
    if (copy === undefined) {
      throw new Error("Buying saved no copy");
    }
    await expectRedirect(() => buying, `/buddies/${copy.id}`);
    expect(copy).toMatchObject({
      name: "Woodworker",
      boughtFrom: listing,
      definition: expect.objectContaining({ prompt: VOICE }),
    });
    expect(await goldOf(buyer)).toBe(STARTING_GOLD - PRICE);
    expect(await goldOf(seller)).toBe(STARTING_GOLD + PRICE);
    expect(await getListing(buyer.id, listing)).toMatchObject({
      viewer: "buyer",
      copy: copy.id,
    });
  });

  test("with too little gold nothing moves and the page says how much is needed", async () => {
    const [seller, buyer] = await Promise.all([testUser(), testUser()]);
    await signIn(buyer);
    await setGold(buyer, SHORT_GOLD);
    const listing = await listed(seller, await ownBuddy(seller));

    expect(
      await buyListingAction(
        { kind: "idle" },
        form({ listingId: listing, price: String(PRICE) }),
      ),
    ).toEqual({
      kind: "refused",
      message: "You need 25 gold. You have 12.",
      earnGold: true,
    });
    expect(await listBuddies(buyer.id)).toEqual([]);
    expect(await goldOf(buyer)).toBe(SHORT_GOLD);
    expect(await goldOf(seller)).toBe(STARTING_GOLD);
    expect(await listOwnListings(seller.id)).toMatchObject([
      { buyers: 0, goldEarned: 0 },
    ]);
  });

  test("a free listing moves no gold, and a bought spell joins the buyer's Spellbook", async () => {
    const [seller, buyer] = await Promise.all([testUser(), testUser()]);
    const listing = await listed(
      seller,
      await ownPromptOf(seller, "spell"),
      0,
      "spell",
    );

    const bought = await buyAsShown(buyer, listing);
    expect(bought).toMatchObject({ kind: "bought", copy: { kind: "spell" } });
    const spells = await listOwnSpells(buyer.id);
    expect(spells).toHaveLength(1);
    expect(spells[0]?.definition.prompt).toBe("Ask about wood grain.");
    expect(await goldOf(buyer)).toBe(STARTING_GOLD);
    expect(await goldOf(seller)).toBe(STARTING_GOLD);
  });

  test("buying twice at once charges once, and buying again after deleting the copy charges again", async () => {
    const [seller, buyer] = await Promise.all([testUser(), testUser()]);
    const listing = await listed(seller, await ownBuddy(seller));

    const outcomes = await Promise.all(
      Array.from({ length: BUYS_AT_ONCE }, () => buyAsShown(buyer, listing)),
    );
    expect(outcomes.filter(({ kind }) => kind === "bought")).toHaveLength(1);
    expect(outcomes.filter(({ kind }) => kind === "held")).toHaveLength(
      BUYS_AT_ONCE - 1,
    );
    const copies = await listBuddies(buyer.id);
    expect(copies).toHaveLength(1);
    expect(await goldOf(buyer)).toBe(STARTING_GOLD - PRICE);

    const [copy] = copies;
    if (copy === undefined) {
      throw new Error("No copy was saved");
    }
    await deleteBuddy(buyer.id, copy.id);
    expect(await buyAsShown(buyer, listing)).toMatchObject({
      kind: "bought",
    });
    expect(await goldOf(buyer)).toBe(STARTING_GOLD - PRICE - PRICE);
    expect(await listOwnListings(seller.id)).toMatchObject([
      { buyers: 1, goldEarned: PRICE + PRICE },
    ]);
  });

  test("a purchase is all or nothing when the buyer's gold is spent at the same time", async () => {
    const [seller, buyer] = await Promise.all([testUser(), testUser()]);
    const [first, second] = await Promise.all([
      listed(seller, await ownBuddy(seller, "First"), RACING_PRICE),
      listed(seller, await ownBuddy(seller, "Second"), RACING_PRICE),
    ]);

    const [one, two] = await Promise.all([
      buyAsShown(buyer, first),
      buyAsShown(buyer, second),
      chargeGold(buyer.id, CALL_COST_MICRO_USD),
    ]);
    const kinds = [one?.kind, two?.kind].toSorted();
    expect(kinds).toEqual(["bought", "too-little-gold"]);
    expect(await listBuddies(buyer.id)).toHaveLength(1);
    const spent = RACING_PRICE * MICRO_USD_PER_GOLD + CALL_COST_MICRO_USD;
    expect(await readGoldBalance(buyer.id)).toBe(
      STARTING_GOLD * MICRO_USD_PER_GOLD - spent,
    );
    expect(await goldOf(seller)).toBe(STARTING_GOLD + RACING_PRICE);
  });

  test("a price changed since the page showed it charges nothing and says the price now", async () => {
    const [seller, buyer] = await Promise.all([testUser(), testUser()]);
    await signIn(buyer);
    const promptId = await ownBuddy(seller);
    const listing = await listed(seller, promptId, 1);
    const shown = await getListing(buyer.id, listing);
    await updateListing(seller.id, listing, {
      description: DESCRIPTION,
      price: RAISED_PRICE,
    });

    expect(
      await buyListingAction(
        { kind: "idle" },
        form({ listingId: listing, price: String(shown?.price) }),
      ),
    ).toEqual({
      kind: "refused",
      message: "The price is now 90 gold.",
      earnGold: false,
    });
    expect(await listBuddies(buyer.id)).toEqual([]);
    expect(await goldOf(buyer)).toBe(STARTING_GOLD);
    expect(await goldOf(seller)).toBe(STARTING_GOLD);
    await expectNotFound(() =>
      buyListingAction({ kind: "idle" }, form({ listingId: listing })),
    );
  });

  test("getting a free listing again after deleting the copy counts its buyer once", async () => {
    const [seller, buyer] = await Promise.all([testUser(), testUser()]);
    const listing = await listed(seller, await ownBuddy(seller), 0);
    await getAndDelete(buyer, listing);
    await getAndDelete(buyer, listing);
    expect(await listOwnListings(seller.id)).toMatchObject([
      { buyers: 1, goldEarned: 0 },
    ]);
  });

  test("trying to buy more than 30 times an hour is refused", async () => {
    const [seller, buyer] = await Promise.all([testUser(), testUser()]);
    const listing = await listed(seller, await ownBuddy(seller), 0);
    const tries = Array.from({ length: PURCHASES_PER_HOUR }, () =>
      buyListing(buyer.id, { listingId: listing, price: 0 }),
    );
    const outcomes = await Promise.all(tries);
    expect(outcomes.filter(({ kind }) => kind === "limited")).toEqual([]);
    expect(
      await buyListing(buyer.id, { listingId: listing, price: 0 }),
    ).toEqual({ kind: "limited" });
  });

  test("deleting the seller while their listing is bought is all or nothing, and moves no gold beyond the price", async () => {
    const outcomes = await Promise.all(
      Array.from({ length: SELLER_DELETION_RACES }, () => buyWhileSellerGoes()),
    );
    expect(outcomes).toEqual(
      outcomes.map(() =>
        expect.objectContaining({ consistent: true, deleted: true }),
      ),
    );
  });

  test("a spell listing beyond the spell's limits saves no copy and charges nothing", async () => {
    const [seller, buyer] = await Promise.all([testUser(), testUser()]);
    const listing = await listed(
      seller,
      await ownPromptOf(seller, "spell"),
      PRICE,
      "spell",
    );
    // A listing the site never writes: its instructions grown past the
    // spell's limit, as only a hand-edited row could be.
    await getDb()
      .update(listings)
      .set({
        parts: {
          whenToUse: "When asked.",
          prompt: "x".repeat(SPELL_TEXT_MAX.prompt + 1),
        },
      })
      .where(eq(listings.id, listing));

    expect(await buyAsShown(buyer, listing)).toEqual({ kind: "not-found" });
    expect(await listOwnSpells(buyer.id)).toEqual([]);
    expect(await goldOf(buyer)).toBe(STARTING_GOLD);
    expect(await listOwnListings(seller.id)).toMatchObject([{ buyers: 0 }]);
  });

  test("a buyer can't buy their own listing or an unlisted one, and a malformed id is not found", async () => {
    const [seller, buyer] = await Promise.all([testUser(), testUser()]);
    await signIn(buyer);
    const listing = await listed(seller, await ownBuddy(seller));

    expect(await buyAsShown(seller, listing)).toEqual({
      kind: "not-found",
    });
    await unlistListing(seller.id, listing);
    expect(await buyAsShown(buyer, listing)).toEqual({ kind: "not-found" });
    expect(
      await buyListing(buyer.id, { listingId: "not-a-listing", price: 0 }),
    ).toEqual({
      kind: "not-found",
    });
    await expectNotFound(() => buyListingAction({ kind: "idle" }, form({})));
    expect(await goldOf(buyer)).toBe(STARTING_GOLD);
  });

  test("deleting the seller's account deletes their listings, and buyers keep their copies", async () => {
    const [seller, buyer] = await Promise.all([testUser(), testUser()]);
    const listing = await listed(seller, await ownBuddy(seller), 0);
    const bought = await buyAsShown(buyer, listing);
    if (bought.kind !== "bought") {
      throw new Error("The listing was not bought");
    }

    await deleteAccount(seller);
    expect(await getListing(buyer.id, listing)).toBeUndefined();
    expect(await getOwnBuddy(buyer.id, bought.copy.id)).toMatchObject({
      name: "Woodworker",
      boughtFrom: listing,
    });
  });
});

describe("use_case_manage_listings", () => {
  test("updating republishes the prompt's current name and parts; until then the listing keeps its copy", async () => {
    const [seller, buyer] = await Promise.all([testUser(), testUser()]);
    await signIn(seller);
    const promptId = await ownPromptOf(seller, "activity");
    const listing = await listed(seller, promptId, 0, "activity");
    await updateActivity(seller.id, promptId, {
      name: "Birdhouse brainstorm",
      definition: {
        prompt: "Brainstorm feeders.",
        openingRequest: "Let's go.",
      },
    });

    const before = await buyAsShown(buyer, listing);
    if (before.kind !== "bought") {
      throw new Error("The listing was not bought");
    }
    expect(await getOwnActivity(buyer.id, before.copy.id)).toMatchObject({
      definition: { prompt: "Brainstorm birdhouses." },
    });

    expect(
      await updateListingAction(
        { kind: "idle" },
        form({
          listingId: listing,
          kind: "activity",
          description: "New words",
          price: "5",
        }),
      ),
    ).toEqual({ kind: "updated" });
    expect(await getListing(seller.id, listing)).toMatchObject({
      name: "Birdhouse brainstorm",
      description: "New words",
      price: 5,
    });
    expect(await getOwnActivity(buyer.id, before.copy.id)).toMatchObject({
      definition: { prompt: "Brainstorm birdhouses." },
    });
  });

  test("Your listings counts what each listing sold and earned, and unlisting keeps buyers' copies", async () => {
    const [seller, buyer, other] = await Promise.all([
      testUser(),
      testUser(),
      testUser(),
    ]);
    await signIn(seller);
    const listing = await listed(seller, await ownBuddy(seller));
    const bought = await buyAsShown(buyer, listing);
    if (bought.kind !== "bought") {
      throw new Error("The listing was not bought");
    }

    await unlistListingAction(form({ listingId: listing }));
    expect(await listOwnListings(seller.id)).toEqual([
      {
        id: listing,
        kind: "buddy",
        name: "Woodworker",
        price: PRICE,
        listed: false,
        buyers: 1,
        goldEarned: PRICE,
      },
    ]);
    expect(await getOwnBuddy(buyer.id, bought.copy.id)).toBeDefined();
    expect(await listOwnListings(other.id)).toEqual([]);
  });

  test("another user can't update or unlist someone's listing", async () => {
    const [seller, other] = await Promise.all([testUser(), testUser()]);
    await signIn(other);
    const listing = await listed(seller, await ownBuddy(seller));

    expect(
      await updateListing(other.id, listing, { description: "Mine", price: 0 }),
    ).toEqual({ kind: "not-found" });
    expect(await unlistListing(other.id, listing)).toBe(false);
    await unlistListingAction(form({ listingId: listing }));
    expect(await getListing(other.id, listing)).toMatchObject({
      description: DESCRIPTION,
      price: PRICE,
      viewer: "buyer",
    });
  });

  test("deleting the prompt doesn't unlist its listing, which then can't be updated", async () => {
    const seller = await testUser();
    const promptId = await ownBuddy(seller);
    const listing = await listed(seller, promptId);

    await deleteBuddy(seller.id, promptId);
    expect(await getListing(seller.id, listing)).toMatchObject({
      listed: true,
      source: undefined,
    });
    expect(
      await updateListing(seller.id, listing, { description: "", price: 0 }),
    ).toEqual({ kind: "source-gone" });
  });
});
