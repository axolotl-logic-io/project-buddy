// The Marketplace's pages in Chromium and WebKit. "use_case_browse_marketplace":
// listings show their name, kind, seller and price, and their descriptions
// as plain text, with a kind filter that marks the kind shown; a listing's
// page says another user wrote it. "use_case_buy_listing": too little gold
// says how much is needed and links to earning more.
// "use_case_manage_listings": Your listings counts each listing's sales and
// names its buttons for it. "use_case_sell_in_marketplace": the sell form
// on an own prompt's page shows a refusal at its field. What the actions
// save is marketplace.server.test.ts's.
import { afterEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import ListingPage from "@/app/(workspace)/marketplace/[listingId]/page.tsx";
import type {
  buyListingAction,
  sellListingAction,
  unlistListingAction,
  updateListingAction,
} from "@/app/(workspace)/marketplace/actions.ts";
import MarketplacePage from "@/app/(workspace)/marketplace/page.tsx";
import { SellSection } from "@/app/(workspace)/marketplace/sell-section.tsx";
import type {
  getListing,
  listListings,
  listOwnListings,
} from "@/marketplace/listing-store.ts";
import {
  LISTING_COPY,
  MARKETPLACE_COPY,
  SELL_COPY,
  YOUR_LISTINGS_COPY,
} from "@/ui/copy/marketplace.ts";
import { userConstructIdFixture } from "../../../../support/id-fixtures.ts";
import {
  SIGNED_IN_USER,
  signInAs,
} from "../../../auth/current-user-test-kit.ts";
import {
  CONSTRUCT_LISTING,
  CONSTRUCT_LISTING_AS_SELLER,
  CONSTRUCT_LISTING_TO_BUY,
  OWN_LISTINGS,
  SPELL_LISTING,
} from "../../../marketplace/marketplace-fixtures.ts";
import { inWorkspace } from "../../workspace-test-kit.tsx";

vi.mock("@/orbs/orb-store.ts", () => {
  const starting = 100;
  return { readOrbsBalance: async (): Promise<number> => starting };
});

const cutover = vi.hoisted(() => ({ enabled: true }));
vi.mock("@/marketplace/cutover.ts", () => ({
  orbPurchasesEnabled: async (): Promise<boolean> => cutover.enabled,
}));

const actions = vi.hoisted(() => ({
  buyListingAction: vi.fn<typeof buyListingAction>(),
  sellListingAction: vi.fn<typeof sellListingAction>(),
  unlistListingAction: vi.fn<typeof unlistListingAction>(),
  updateListingAction: vi.fn<typeof updateListingAction>(),
}));
vi.mock("@/app/(workspace)/marketplace/actions.ts", () => actions);
vi.mock(
  "@/auth/current-user.ts",
  () => import("../../../auth/current-user-test-kit.ts"),
);
const stores = vi.hoisted(() => ({
  getListing: vi.fn<typeof getListing>(),
  listListings: vi.fn<typeof listListings>(),
  listOwnListings: vi.fn<typeof listOwnListings>(),
}));
vi.mock("@/marketplace/listing-store.ts", () => stores);

const NO_PARAMS: Promise<Record<string, never>> = Promise.resolve({});
const STARTING_ORBS = 100;
const PRICE = 3;
const SHORT_GOLD = 2;
const PRICE_MAX = 5;
// The filter's link to constructs alone.
const CONSTRUCTS_ONLY = new URLSearchParams({ kind: "construct" });

// The Marketplace page, showing listings of the kind, or every kind.
async function marketplace(kind?: string): Promise<void> {
  signInAs(SIGNED_IN_USER);
  stores.listListings.mockResolvedValue([CONSTRUCT_LISTING, SPELL_LISTING]);
  stores.listOwnListings.mockResolvedValue([...OWN_LISTINGS]);
  let query: Record<string, string> = {};
  if (kind !== undefined) {
    query = { kind };
  }
  await render(
    inWorkspace(
      await MarketplacePage({ searchParams: Promise.resolve(query) }),
    ),
  );
}

// A listing's page, as the store gives it.
async function listingPage(
  listing: Awaited<ReturnType<typeof getListing>>,
): Promise<void> {
  signInAs(SIGNED_IN_USER);
  stores.getListing.mockResolvedValue(listing);
  await render(
    inWorkspace(
      await ListingPage({
        params: Promise.resolve({ listingId: CONSTRUCT_LISTING.id }),
        searchParams: NO_PARAMS,
      }),
    ),
  );
}

afterEach(() => {
  cutover.enabled = true;
  vi.clearAllMocks();
});

describe("use_case_browse_marketplace", () => {
  test("listings show their kind, seller and price, and their descriptions as plain text", async () => {
    await marketplace();

    const listings = page.getByRole("region", {
      name: MARKETPLACE_COPY.listingsHeading,
    });
    await expect
      .element(listings.getByRole("link", { name: CONSTRUCT_LISTING.name }))
      .toHaveAttribute("href", `/marketplace/${CONSTRUCT_LISTING.id}`);
    await expect
      .element(listings.getByText(CONSTRUCT_LISTING.description))
      .toBeVisible();
    await expect
      .element(listings.getByText("Construct by A Project Buddy user"))
      .toBeVisible();
    await expect
      .element(listings.getByText("Spell by Sam Seller"))
      .toBeVisible();
    await expect.element(listings.getByText("3 orbs")).toBeVisible();
    await expect.element(listings.getByText("Free")).toBeVisible();
    expect(listings.element().querySelector("b")).toBeNull();
    expect(listings.element().querySelector("strong")).toBeNull();
  });

  test("the kind filter marks the kind shown and asks the store for it", async () => {
    await marketplace("spell");

    const filter = page.getByRole("navigation", {
      name: MARKETPLACE_COPY.filterLabel,
    });
    await expect
      .element(filter.getByRole("link", { name: "Spells" }))
      .toHaveAttribute("aria-current", "page");
    await expect
      .element(filter.getByRole("link", { name: "All" }))
      .not.toHaveAttribute("aria-current");
    await expect
      .element(filter.getByRole("link", { name: "Constructs" }))
      .toHaveAttribute("href", `/marketplace?${CONSTRUCTS_ONLY}`);
    expect(stores.listListings).toHaveBeenCalledWith(SIGNED_IN_USER.id, {
      kind: "spell",
      after: undefined,
    });
  });

  test("an older link that names constructs by their first name, buddy, still shows constructs", async () => {
    await marketplace("buddy");

    const filter = page.getByRole("navigation", {
      name: MARKETPLACE_COPY.filterLabel,
    });
    await expect
      .element(filter.getByRole("link", { name: "Constructs" }))
      .toHaveAttribute("aria-current", "page");
    expect(stores.listListings).toHaveBeenCalledWith(SIGNED_IN_USER.id, {
      kind: "construct",
      after: undefined,
    });
  });

  test("a listing's page says another user wrote it, and offers to buy it", async () => {
    await listingPage(CONSTRUCT_LISTING_TO_BUY);

    await expect
      .element(page.getByRole("heading", { level: 1 }))
      .toHaveTextContent(CONSTRUCT_LISTING.name);
    await expect
      .element(page.getByText(LISTING_COPY.writtenByAnother("construct")))
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: "Buy for 3 orbs" }))
      .toBeVisible();
  });
});

describe("use_case_buy_listing", () => {
  test("too few orbs says how much is needed and distinguishes Batteries", async () => {
    actions.buyListingAction.mockResolvedValue({
      kind: "refused",
      message: LISTING_COPY.tooLittleGold(PRICE, SHORT_GOLD),
      earnGold: false,
    });
    await listingPage(CONSTRUCT_LISTING_TO_BUY);

    await page.getByRole("button", { name: "Buy for 3 orbs" }).click();

    await expect
      .element(page.getByText(MARKETPLACE_COPY.orbBalance(STARTING_ORBS)))
      .toBeVisible();
    const alert = page.getByText("You need 3 orbs. You have 2.");
    await expect.element(alert).toBeVisible();
    await expect
      .element(page.getByRole("link", { name: MARKETPLACE_COPY.earnGold }))
      .not.toBeInTheDocument();
    const [, sent] = actions.buyListingAction.mock.lastCall ?? [];
    expect(sent?.get("listingId")).toBe(CONSTRUCT_LISTING.id);
    expect(sent?.get("price")).toBe(String(PRICE));
    expect(sent?.get("currency")).toBe("orbs");
  });

  test("a listing they already have links to their copy instead", async () => {
    const copy = userConstructIdFixture();
    await listingPage({ ...CONSTRUCT_LISTING_TO_BUY, copy });

    await expect
      .element(
        page.getByRole("link", { name: LISTING_COPY.openCopy("construct") }),
      )
      .toHaveAttribute("href", `/constructs/${copy}`);
    await expect
      .element(page.getByRole("button", { name: "Buy for 3 orbs" }))
      .not.toBeInTheDocument();
  });
});

describe("use_case_manage_listings", () => {
  test("Your listings counts each listing's sales, with buttons named for it", async () => {
    await marketplace();

    const yours = page.getByRole("region", {
      name: YOUR_LISTINGS_COPY.heading,
    });
    await expect
      .element(
        yours.getByText(
          "Construct · Listed: 3 orbs · Bought by 3 users · 9 orbs earned",
        ),
      )
      .toBeVisible();
    await expect
      .element(
        yours.getByText("Spell · Unlisted · Bought by 1 user · 0 orbs earned"),
      )
      .toBeVisible();
    await expect
      .element(
        yours.getByRole("button", {
          name: YOUR_LISTINGS_COPY.unlistLabel(CONSTRUCT_LISTING.name),
        }),
      )
      .toBeVisible();
    await expect
      .element(
        yours.getByRole("button", {
          name: YOUR_LISTINGS_COPY.unlistLabel(SPELL_LISTING.name),
        }),
      )
      .not.toBeInTheDocument();
  });

  test("the seller's listing page updates it, and says when its prompt is gone", async () => {
    actions.updateListingAction.mockResolvedValue({ kind: "updated" });
    await listingPage(CONSTRUCT_LISTING_AS_SELLER);

    await page
      .getByRole("spinbutton", { name: SELL_COPY.priceLabel })
      .fill("4");
    await page.getByRole("button", { name: LISTING_COPY.update }).click();
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent(LISTING_COPY.updated);
    const [, sent] = actions.updateListingAction.mock.lastCall ?? [];
    expect(sent?.get("price")).toBe("4");
    expect(sent?.get("listingId")).toBe(CONSTRUCT_LISTING.id);
  });

  test("a listing whose prompt was deleted offers only unlisting", async () => {
    await listingPage({ ...CONSTRUCT_LISTING_AS_SELLER, source: undefined });

    await expect
      .element(page.getByText(LISTING_COPY.sourceGone("construct")))
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: LISTING_COPY.update }))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole("button", { name: LISTING_COPY.unlist }))
      .toBeVisible();
  });
});

describe("use_case_sell_in_marketplace", () => {
  test("the sell form shows a refusal at its field and keeps what was typed", async () => {
    actions.sellListingAction.mockResolvedValue({
      kind: "refused",
      field: "price",
      message: SELL_COPY.priceInvalid(PRICE_MAX),
    });
    const promptId = userConstructIdFixture();
    await render(
      <SellSection
        kind="spell"
        promptId={promptId}
        sale={{ kind: "listable" }}
      />,
    );

    await page
      .getByRole("textbox", { name: SELL_COPY.descriptionLabel })
      .fill("Asks first.");
    await page.getByRole("button", { name: SELL_COPY.sell }).click();

    const price = page.getByRole("spinbutton", { name: SELL_COPY.priceLabel });
    await expect.element(price).toHaveAttribute("aria-invalid", "true");
    await expect
      .element(price)
      .toHaveAccessibleDescription(
        expect.stringContaining(SELL_COPY.priceInvalid(PRICE_MAX)),
      );
    await expect
      .element(page.getByRole("textbox", { name: SELL_COPY.descriptionLabel }))
      .toHaveValue("Asks first.");
    const [, sent] = actions.sellListingAction.mock.lastCall ?? [];
    expect(sent?.get("kind")).toBe("spell");
    expect(sent?.get("promptId")).toBe(promptId);
  });

  test("a bought prompt says it can't be sold, with no form", async () => {
    await render(
      <SellSection
        kind="construct"
        promptId={userConstructIdFixture()}
        sale={{ kind: "bought" }}
      />,
    );

    await expect
      .element(page.getByText(SELL_COPY.bought("construct")))
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: SELL_COPY.sell }))
      .not.toBeInTheDocument();
  });
});

test("disabled rollout explains the pause and offers no buy even for a free listing", async () => {
  cutover.enabled = false;
  await listingPage({ ...CONSTRUCT_LISTING_TO_BUY, price: 0 });
  await expect.element(page.getByText(MARKETPLACE_COPY.paused)).toBeVisible();
  await expect
    .element(page.getByRole("button", { name: LISTING_COPY.buy(0) }))
    .not.toBeInTheDocument();
});

test("legacy listing requires an explicitly chosen orb price", async () => {
  await listingPage({ ...CONSTRUCT_LISTING_AS_SELLER, legacy: true });
  await expect.element(page.getByText(LISTING_COPY.legacy)).toBeVisible();
  await expect
    .element(page.getByRole("spinbutton", { name: SELL_COPY.priceLabel }))
    .toHaveValue(null);
});
