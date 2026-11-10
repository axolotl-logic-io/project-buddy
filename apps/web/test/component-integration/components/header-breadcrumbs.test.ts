import { beforeEach, describe, expect, test, vi } from "vitest";
import { headerBreadcrumbs } from "@/components/header-breadcrumbs.ts";
import { parseUserId } from "@/ids.ts";
import { CHAT_NAME_COPY, NEW_CHAT_COPY } from "@/ui/copy/chat.ts";

const stores = vi.hoisted(() => ({
  getChat: vi.fn(),
  getProject: vi.fn(),
  getOwnConstruct: vi.fn(),
  getOwnActivity: vi.fn(),
  getOwnSpell: vi.fn(),
  getListing: vi.fn(),
  getRetiredDefinition: vi.fn(),
  readProjectInvitation: vi.fn(),
}));
vi.mock("@/chats/store.ts", () => stores);
vi.mock("@/projects/store.ts", () => stores);
vi.mock("@/activities/activity-store.ts", () => stores);
vi.mock("@/constructs/construct-store.ts", () => stores);
vi.mock("@/spells/spell-store.ts", () => stores);
vi.mock("@/marketplace/listing-store.ts", () => stores);
vi.mock("@/retirement/retirement-store.ts", () => stores);
vi.mock("@/projects/project-invitations.ts", () => stores);

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
  test("uses the accessible quest for an adventure and updates to standalone and Home", async () => {
    if (USER === undefined) {
      throw new Error("Invalid fixture user");
    }
    stores.getChat.mockResolvedValue({
      name: "A discovery",
      project: { id: "quest", name: "Our quest" },
    });
    expect(await headerBreadcrumbs(USER, ["chats", "adventure"])).toEqual([
      { label: "Home", href: "/home" },
      { label: "All quests", href: "/projects" },
      { label: "Our quest", href: "/projects/quest" },
      { label: "A discovery" },
    ]);
    expect(stores.getChat).toHaveBeenCalledWith(USER, "adventure");
    stores.getChat.mockResolvedValue({ name: "An idea" });
    expect(await headerBreadcrumbs(USER, ["chats", "standalone"])).toEqual([
      { label: "Home", href: "/home" },
      { label: "Adventures", href: "/chat" },
      { label: "An idea" },
    ]);
    expect(await headerBreadcrumbs(USER, ["home"])).toEqual([
      { label: "Home" },
    ]);
  });

  test("puts a new adventure under Adventures", async () => {
    if (USER === undefined) {
      throw new Error("Invalid fixture user");
    }
    expect(await headerBreadcrumbs(USER, ["chats", "new"])).toEqual([
      { label: "Home", href: "/home" },
      { label: "Adventures", href: "/chat" },
      { label: NEW_CHAT_COPY.heading },
    ]);
  });

  test("names an unnamed adventure with the shared fallback", async () => {
    if (USER === undefined) {
      throw new Error("Invalid fixture user");
    }
    stores.getChat.mockResolvedValue({});
    expect(
      (await headerBreadcrumbs(USER, ["chats", "unnamed"])).at(-1),
    ).toEqual({
      label: CHAT_NAME_COPY.fallback,
    });
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
