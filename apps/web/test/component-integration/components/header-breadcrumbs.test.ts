import { beforeEach, describe, expect, test, vi } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import { headerBreadcrumbs } from "@/components/header-breadcrumbs.ts";
import { parseUserId } from "@/ids.ts";

const stores = vi.hoisted(() => ({
  getQuest: vi.fn(),
  getOwnConstruct: vi.fn(),
  getRetiredDefinition: vi.fn(),
}));
vi.mock("@/quests/store.ts", () => stores);
vi.mock("@/constructs/construct-store.ts", () => stores);
vi.mock("@/retirement/retirement-store.ts", () => stores);

const USER = parseUserId("00000000-0000-4000-8000-000000000001");

// The fixture user, in role.
function signedIn(role: User["role"]): Pick<User, "id" | "role"> {
  if (USER === undefined) {
    throw new Error("Invalid fixture user");
  }
  return { id: USER, role };
}

const MEMBER = signedIn("user");

beforeEach(() => {
  vi.resetAllMocks();
});

describe("header navigation hierarchy", () => {
  test.each([
    { section: "workshop", label: "Workshop" },
    { section: "retirement", label: "Graveyard" },
    { section: "settings", label: "Settings" },
  ])("$label is a top-level destination", async ({ section, label }) => {
    const trail = await headerBreadcrumbs(MEMBER, [section]);
    expect(trail).toHaveLength(1);
    expect(trail[0]?.label).toBe(label);
    expect(trail[0]?.href).toBeUndefined();
  });

  test("removed destinations have no breadcrumb", async () => {
    const paths = [
      ["library"],
      ["library", "model-context"],
      ["chat"],
      ["chats", "new"],
    ];
    const trails = await Promise.all(
      paths.map((path) => headerBreadcrumbs(MEMBER, path)),
    );
    expect(trails).toEqual([[], [], [], []]);
    expect(await headerBreadcrumbs(MEMBER, ["quests"])).toEqual([
      { label: "Quests" },
    ]);
  });

  test("removed quest subpages have no breadcrumb", async () => {
    expect(
      await headerBreadcrumbs(MEMBER, ["quests", "quest", "memory"]),
    ).toEqual([]);
  });

  test("exposes no private name or parent for inaccessible and unknown pages", async () => {
    const trails = await Promise.all(
      [
        "quests",
        "chats",
        "constructs",
        "activities",
        "spellbook",
        "retirement",
      ].map((section) => headerBreadcrumbs(MEMBER, [section, "foreign"])),
    );
    for (const trail of trails) {
      expect(trail).toEqual([]);
    }
    expect(
      await headerBreadcrumbs(MEMBER, ["quests", "foreign", "unknown"]),
    ).toEqual([]);
    expect(await headerBreadcrumbs(MEMBER, ["missing"])).toEqual([]);
  });

  test("keeps definition names and their existing destinations", async () => {
    stores.getOwnConstruct.mockResolvedValue({ name: "My construct" });
    const trail = await headerBreadcrumbs(MEMBER, ["constructs", "own"]);
    expect(trail).toEqual([
      { label: "Workshop", href: "/workshop" },
      { label: "Constructs", href: "/workshop" },
      { label: "My construct" },
    ]);
    expect(stores.getOwnConstruct).toHaveBeenCalledWith(USER, "own");
    expect(
      (await headerBreadcrumbs(MEMBER, ["constructs", "lumen"])).at(-1)?.label,
    ).toBe("Lumen");
  });

  test("leads from a spell to the Workshop’s Spells tab", async () => {
    expect(
      await headerBreadcrumbs(MEMBER, ["spellbook", "brainstorm"]),
    ).toEqual([
      { label: "Workshop", href: "/workshop" },
      {
        label: "Spells",
        href: `/workshop?${new URLSearchParams({ kind: "spell" })}`,
      },
      { label: "Brainstorm" },
    ]);
  });
});
