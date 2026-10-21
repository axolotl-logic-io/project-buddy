import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import BuddiesPage from "@/app/(workspace)/buddies/(list)/page.tsx";
import type {
  listBuddies as listOwnBuddies,
  UserBuddy,
} from "@/buddies/buddy-store.ts";
import { getBuddy, listBuddies } from "@/buddies/index.ts";
import { BUDDIES_COPY } from "@/ui/copy/buddies.ts";
import {
  SIGNED_IN_USER,
  signInAs,
} from "../../../../auth/current-user-test-kit.ts";
import { userBuddyIdFixture } from "../../../../id-fixtures.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../../../../auth/current-user-test-kit.ts"),
);

const store = vi.hoisted(() => ({
  listBuddies: vi.fn<typeof listOwnBuddies>(),
}));
vi.mock("@/buddies/buddy-store.ts", () => store);

const OWN_BUDDY: UserBuddy = {
  id: userBuddyIdFixture(),
  name: "Mr. Tee (clone)",
  parts: getBuddy("mr-tee").parts,
  clonedFrom: "mr-tee",
  createdAt: new Date("2026-10-12T09:00:00Z"),
  updatedAt: new Date("2026-10-12T09:00:00Z"),
};

function section(name: string): HTMLElement {
  return screen.getByRole("region", { name });
}
function cardNames(region: HTMLElement): (string | null)[] {
  return within(region)
    .getAllByRole("listitem")
    .map((item) => within(item).getByRole("link").textContent);
}

beforeEach(() => {
  vi.clearAllMocks();
  signInAs(SIGNED_IN_USER);
  store.listBuddies.mockResolvedValue([OWN_BUDDY]);
});

// The page and its lists.
function listTests(): void {
  test("is titled Buddies and links home", async () => {
    render(await BuddiesPage());

    expect(
      screen.getByRole("heading", { level: 1, name: BUDDIES_COPY.heading }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: BUDDIES_COPY.homeLink }),
    ).toHaveAttribute("href", "/");
  });

  test("lists the six built-in buddies and her own", async () => {
    render(await BuddiesPage());

    const builtIn = listBuddies().map((buddy) => buddy.name);
    expect(cardNames(section(BUDDIES_COPY.builtInHeading))).toEqual(builtIn);
    expect(cardNames(section(BUDDIES_COPY.ownHeading))).toEqual([
      OWN_BUDDY.name,
    ]);
    expect(store.listBuddies).toHaveBeenCalledWith(SIGNED_IN_USER.id);
  });

  test("says she has none of her own yet", async () => {
    store.listBuddies.mockResolvedValue([]);

    render(await BuddiesPage());

    expect(
      within(section(BUDDIES_COPY.ownHeading)).getByText(BUDDIES_COPY.noOwn),
    ).toBeInTheDocument();
  });
}

// Each buddy's offers: customize, tweak or clone.
function offerTests(): void {
  test("offers to customize each built-in buddy, by its id", async () => {
    render(await BuddiesPage());

    for (const buddy of listBuddies()) {
      const button = screen.getByRole("button", {
        name: BUDDIES_COPY.customizeLabel(buddy.name),
      });
      expect(button).toHaveTextContent(BUDDIES_COPY.customize);
      expect(button).toHaveAttribute("type", "submit");
      const form = button.closest("form");
      expect(form && new FormData(form).get("buddyId")).toBe(buddy.id);
      expect(
        screen.queryByRole("button", {
          name: BUDDIES_COPY.cloneLabel(buddy.name),
        }),
      ).not.toBeInTheDocument();
    }
  });

  test("offers to tweak each of her own buddies in place", async () => {
    render(await BuddiesPage());

    const link = screen.getByRole("link", {
      name: BUDDIES_COPY.tweakLabel(OWN_BUDDY.name),
    });
    expect(link).toHaveTextContent(BUDDIES_COPY.tweak);
    expect(link).toHaveAttribute("href", `/buddies/${OWN_BUDDY.id}`);
  });

  test("offers to clone each of her own buddies, by its id", async () => {
    render(await BuddiesPage());

    const button = screen.getByRole("button", {
      name: BUDDIES_COPY.cloneLabel(OWN_BUDDY.name),
    });
    expect(button).toHaveTextContent(BUDDIES_COPY.clone);
    expect(button).toHaveAttribute("type", "submit");
    const form = button.closest("form");
    expect(form && new FormData(form).get("sourceId")).toBe(OWN_BUDDY.id);
  });
}

describe("use_case_view_buddies", () => {
  listTests();
});

describe("use_case_customize_buddy", () => {
  offerTests();
});
