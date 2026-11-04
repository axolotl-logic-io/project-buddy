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
import { userBuddyIdFixture } from "../../../../support/id-fixtures.ts";
import {
  SIGNED_IN_USER,
  signInAs,
} from "../../../auth/current-user-test-kit.ts";
import {
  BUDDY_LISTING,
  BUDDY_LISTING_AS_SELLER,
  BUDDY_LISTING_TO_BUY,
  OWN_LISTINGS,
  SPELL_LISTING,
} from "../../../marketplace/marketplace-fixtures.ts";
import { inWorkspace } from "../../workspace-test-kit.tsx";

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
const PRICE = 25;
const SHORT_GOLD = 12;
const PRICE_MAX = 10_000;
// The filter's link to buddies alone.
const BUDDIES_ONLY = new URLSearchParams({ kind: "buddy" });

// The Marketplace page, showing listings of the kind, or every kind.
async function marketplace(kind?: string): Promise<void> {
  signInAs(SIGNED_IN_USER);
  stores.listListings.mockResolvedValue([BUDDY_LISTING, SPELL_LISTING]);
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
        params: Promise.resolve({ listingId: BUDDY_LISTING.id }),
        searchParams: NO_PARAMS,
      }),
    ),
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("use_case_browse_marketplace", () => {
  test("listings show their kind, seller and price, and their descriptions as plain text", async () => {
    await marketplace();

    const listings = page.getByRole("region", {
      name: MARKETPLACE_COPY.listingsHeading,
    });
    await expect
      .element(listings.getByRole("link", { name: BUDDY_LISTING.name }))
      .toHaveAttribute("href", `/marketplace/${BUDDY_LISTING.id}`);
    await expect
      .element(listings.getByText(BUDDY_LISTING.description))
      .toBeVisible();
    await expect
      .element(listings.getByText("Buddy by A Project Buddy user"))
      .toBeVisible();
    await expect
      .element(listings.getByText("Spell by Sam Seller"))
      .toBeVisible();
    await expect.element(listings.getByText("25 gold")).toBeVisible();
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
      .element(filter.getByRole("link", { name: "Buddies" }))
      .toHaveAttribute("href", `/marketplace?${BUDDIES_ONLY}`);
    expect(stores.listListings).toHaveBeenCalledWith(SIGNED_IN_USER.id, {
      kind: "spell",
      after: undefined,
    });
  });

  test("a listing's page says another user wrote it, and offers to buy it", async () => {
    await listingPage(BUDDY_LISTING_TO_BUY);

    await expect
      .element(page.getByRole("heading", { level: 1 }))
      .toHaveTextContent(BUDDY_LISTING.name);
    await expect
      .element(page.getByText(LISTING_COPY.writtenByAnother("buddy")))
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: "Buy for 25 gold" }))
      .toBeVisible();
  });
});

describe("use_case_buy_listing", () => {
  test("too little gold says how much is needed, with a link to earning gold", async () => {
    actions.buyListingAction.mockResolvedValue({
      kind: "refused",
      message: LISTING_COPY.tooLittleGold(PRICE, SHORT_GOLD),
      earnGold: true,
    });
    await listingPage(BUDDY_LISTING_TO_BUY);

    await expect
      .element(page.getByText(LISTING_COPY.instructionsHidden))
      .toBeVisible();
    await page.getByRole("button", { name: "Buy for 25 gold" }).click();

    const alert = page.getByText("You need 25 gold. You have 12.");
    await expect.element(alert).toBeVisible();
    await expect
      .element(page.getByRole("link", { name: MARKETPLACE_COPY.earnGold }))
      .toHaveAttribute("href", "/marketplace#your-listings");
    const [, sent] = actions.buyListingAction.mock.lastCall ?? [];
    expect(sent?.get("listingId")).toBe(BUDDY_LISTING.id);
    expect(sent?.get("price")).toBe(String(PRICE));
  });

  test("a listing they already have links to their copy instead", async () => {
    const copy = userBuddyIdFixture();
    await listingPage({ ...BUDDY_LISTING_TO_BUY, copy });
    await expect
      .element(page.getByText(LISTING_COPY.instructionsHidden))
      .not.toBeInTheDocument();

    await expect
      .element(page.getByRole("link", { name: LISTING_COPY.openCopy("buddy") }))
      .toHaveAttribute("href", `/buddies/${copy}`);
    await expect
      .element(page.getByRole("button", { name: "Buy for 25 gold" }))
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
          "Buddy · Listed: 25 gold · Bought by 3 users · 75 gold earned",
        ),
      )
      .toBeVisible();
    await expect
      .element(
        yours.getByText("Spell · Unlisted · Bought by 1 user · 0 gold earned"),
      )
      .toBeVisible();
    await expect
      .element(
        yours.getByRole("button", {
          name: YOUR_LISTINGS_COPY.unlistLabel(BUDDY_LISTING.name),
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
    await listingPage(BUDDY_LISTING_AS_SELLER);

    await page
      .getByRole("spinbutton", { name: SELL_COPY.priceLabel })
      .fill("30");
    await page.getByRole("button", { name: LISTING_COPY.update }).click();
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent(LISTING_COPY.updated);
    const [, sent] = actions.updateListingAction.mock.lastCall ?? [];
    expect(sent?.get("price")).toBe("30");
    expect(sent?.get("listingId")).toBe(BUDDY_LISTING.id);
  });

  test("a listing whose prompt was deleted offers only unlisting", async () => {
    await listingPage({ ...BUDDY_LISTING_AS_SELLER, source: undefined });

    await expect
      .element(page.getByText(LISTING_COPY.sourceGone("buddy")))
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
    const promptId = userBuddyIdFixture();
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
        kind="buddy"
        promptId={userBuddyIdFixture()}
        sale={{ kind: "bought" }}
      />,
    );

    await expect
      .element(page.getByText(SELL_COPY.bought("buddy")))
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: SELL_COPY.sell }))
      .not.toBeInTheDocument();
  });
});
