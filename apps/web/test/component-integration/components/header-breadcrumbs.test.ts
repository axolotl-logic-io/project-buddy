import { beforeEach, describe, expect, test, vi } from "vitest";
import { headerBreadcrumbs } from "@/components/header-breadcrumbs.ts";
import { parseUserId } from "@/ids.ts";

const stores = vi.hoisted(() => ({
  getProject: vi.fn(),
  getOwnConstruct: vi.fn(),
  getOwnActivity: vi.fn(),
  getOwnSpell: vi.fn(),
  getListing: vi.fn(),
  getRetiredDefinition: vi.fn(),
}));
vi.mock("@/projects/store.ts", () => stores);
vi.mock("@/activities/activity-store.ts", () => stores);
vi.mock("@/constructs/construct-store.ts", () => stores);
vi.mock("@/spells/spell-store.ts", () => stores);
vi.mock("@/marketplace/listing-store.ts", () => stores);
vi.mock("@/retirement/retirement-store.ts", () => stores);

const USER = parseUserId("00000000-0000-4000-8000-000000000001");

beforeEach(() => {
  vi.resetAllMocks();
});

describe("header navigation hierarchy", () => {
  test("keeps Library books under Library and omits unknown books", async () => {
    if (USER === undefined) {
      throw new Error("Invalid fixture user");
    }
    expect(await headerBreadcrumbs(USER, ["library"])).toEqual([
      { label: "Home", href: "/home" },
      { label: "Library" },
    ]);
    expect(await headerBreadcrumbs(USER, ["library", "model-context"])).toEqual(
      [
        { label: "Home", href: "/home" },
        { label: "Library", href: "/library" },
        { label: "Model context" },
      ],
    );
    expect(await headerBreadcrumbs(USER, ["library", "unknown"])).toEqual([]);
  });
  test("puts Chat under Home, and the old conversation addresses nowhere", async () => {
    if (USER === undefined) {
      throw new Error("Invalid fixture user");
    }
    expect(await headerBreadcrumbs(USER, ["chat"])).toEqual([
      { label: "Home", href: "/home" },
      { label: "Chat" },
    ]);
    expect(await headerBreadcrumbs(USER, ["chats", "new"])).toEqual([]);
    expect(await headerBreadcrumbs(USER, ["home"])).toEqual([
      { label: "Home" },
    ]);
  });

  test("keeps the quest parent on its Journal", async () => {
    if (USER === undefined) {
      throw new Error("Invalid fixture user");
    }
    stores.getProject.mockResolvedValue({ id: "quest", name: "Our quest" });
    expect(
      await headerBreadcrumbs(USER, ["projects", "quest", "memory"]),
    ).toEqual([
      { label: "Home", href: "/home" },
      { label: "All quests", href: "/projects" },
      { label: "Our quest", href: "/projects/quest" },
      { label: "Journal" },
    ]);
    expect(stores.getProject).toHaveBeenCalledWith(USER, "quest");
  });

  test("exposes no private name or parent for inaccessible and unknown pages", async () => {
    if (USER === undefined) {
      throw new Error("Invalid fixture user");
    }
    const trails = await Promise.all(
      [
        "projects",
        "chats",
        "constructs",
        "activities",
        "spellbook",
        "marketplace",
        "retirement",
      ].map((section) => headerBreadcrumbs(USER, [section, "foreign"])),
    );
    for (const trail of trails) {
      expect(trail).toEqual([]);
    }
    expect(
      await headerBreadcrumbs(USER, ["projects", "foreign", "unknown"]),
    ).toEqual([]);
    expect(await headerBreadcrumbs(USER, ["missing"])).toEqual([]);
  });

  test("keeps definition names and their existing destinations", async () => {
    if (USER === undefined) {
      throw new Error("Invalid fixture user");
    }
    stores.getOwnConstruct.mockResolvedValue({ name: "My construct" });
    const trail = await headerBreadcrumbs(USER, ["constructs", "own"]);
    expect(trail).toEqual([
      { label: "Home", href: "/home" },
      { label: "Constructs", href: "/constructs" },
      { label: "My construct" },
    ]);
    expect(stores.getOwnConstruct).toHaveBeenCalledWith(USER, "own");
    expect(
      (await headerBreadcrumbs(USER, ["constructs", "lumen"])).at(-1)?.label,
    ).toBe("Lumen");
  });
});
