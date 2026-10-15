import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { SIGNED_IN_USER, signInAs } from "@/auth/current-user-test-kit.ts";
import type {
  listBuddies as listOwnBuddies,
  UserBuddy,
} from "@/buddies/buddy-store.ts";
import { getBuddy, listBuddies } from "@/buddies/index.ts";
import { userBuddyIdFixture } from "@/id-fixtures.ts";
import { BUDDIES_COPY } from "@/ui/copy/buddies.ts";
import BuddiesPage, { metadata } from "./page.tsx";

vi.mock(
  "@/auth/current-user.ts",
  () => import("@/auth/current-user-test-kit.ts"),
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

// Hippy, Mr. Tee, Fjord Tines, Span Tines, Argon Sprangler and Roland
// Dustchain.
const BUILT_IN_BUDDY_COUNT = 6;

function section(name: string): HTMLElement {
  return screen.getByRole("region", { name });
}

function cardNames(region: HTMLElement): (string | null)[] {
  return within(region)
    .getAllByRole("listitem")
    .map((item) => item.firstElementChild?.textContent ?? null);
}

beforeEach(() => {
  vi.clearAllMocks();
  signInAs(SIGNED_IN_USER);
  store.listBuddies.mockResolvedValue([OWN_BUDDY]);
});

describe("Buddies page", () => {
  test("is titled Buddies and links home", async () => {
    render(await BuddiesPage());

    expect(metadata.title).toBe(BUDDIES_COPY.title);
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
    expect(builtIn).toHaveLength(BUILT_IN_BUDDY_COUNT);
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
});

describe("Buddies page actions", () => {
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
    expect(screen.getAllByRole("button")).toHaveLength(
      BUILT_IN_BUDDY_COUNT + [OWN_BUDDY].length,
    );
  });
});
