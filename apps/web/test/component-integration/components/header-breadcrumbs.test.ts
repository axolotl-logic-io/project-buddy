import { beforeEach, describe, expect, test, vi } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import {
  headerBreadcrumbs,
  publicBreadcrumbs,
} from "@/components/header-breadcrumbs.ts";
import { parseUserId } from "@/ids.ts";

const stores = vi.hoisted(() => ({
  getQuest: vi.fn(),
  getRetiredDefinition: vi.fn(),
  readQuestConversation: vi.fn(),
}));
vi.mock("@/quests/store.ts", () => stores);
vi.mock("@/conversations/start-quest.ts", () => stores);
vi.mock(
  "../../support/test-database/historical-construct-test-kit.ts",
  () => stores,
);
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
    { section: "spellbook", label: "Spellbook" },
    { section: "settings", label: "Settings" },
    { section: "timer", label: "Timer" },
  ])("$label is a top-level destination", async ({ section, label }) => {
    const trail = await headerBreadcrumbs(MEMBER, [section]);
    expect(trail).toHaveLength(1);
    expect(trail[0]?.label).toBe(label);
    expect(trail[0]?.href).toBeUndefined();
  });

  test("a timer link sits under Timer, named by its durations, and carries its schedule", async () => {
    expect(await headerBreadcrumbs(MEMBER, ["timer", "25", "15", "0"])).toEqual(
      [
        { label: "Timer", href: "/timer" },
        {
          label: "Work 25 · Break 15",
          timer: { workMinutes: 25, breakMinutes: 15, startMs: 0 },
        },
      ],
    );
    expect(await headerBreadcrumbs(MEMBER, ["timer", "25", "16", "0"])).toEqual(
      [{ label: "Timer", href: "/timer" }, { label: "Unknown timer" }],
    );
    expect(await headerBreadcrumbs(MEMBER, ["timer", "25"])).toEqual([]);
  });

  test("a signed-out visitor gets the Timer's trails and no other", () => {
    expect(publicBreadcrumbs(["timer"])).toEqual([{ label: "Timer" }]);
    expect(publicBreadcrumbs(["timer", "25", "15", "0"])).toEqual([
      { label: "Timer", href: "/timer" },
      {
        label: "Work 25 · Break 15",
        timer: { workMinutes: 25, breakMinutes: 15, startMs: 0 },
      },
    ]);
    expect(publicBreadcrumbs(["quests"])).toEqual([]);
    expect(publicBreadcrumbs(["settings"])).toEqual([]);
    expect(stores.getQuest).not.toHaveBeenCalled();
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
    expect(await headerBreadcrumbs(MEMBER, ["retirement"])).toEqual([]);
    expect(await headerBreadcrumbs(MEMBER, ["retirement", "own"])).toEqual([]);
    expect(await headerBreadcrumbs(MEMBER, ["quests"])).toEqual([
      { label: "Quests" },
    ]);
  });

  test("the active Dailies quest's crumb carries its started conversation's construct", async () => {
    const quest = {
      id: "dailies",
      name: "Dailies",
      dailies: true,
      status: "active",
    };
    const conversation = { id: "chat", construct: { name: "Lumen" } };
    stores.getQuest.mockResolvedValue(quest);
    stores.readQuestConversation.mockResolvedValue({
      ...conversation,
      spell: undefined,
    });
    expect(await headerBreadcrumbs(MEMBER, ["quests", "dailies"])).toEqual([
      { label: "Quests", href: "/quests" },
      {
        label: "Dailies",
        quest: { id: "dailies", name: "Dailies" },
        conversation,
      },
    ]);
    expect(stores.readQuestConversation).toHaveBeenCalledWith(USER, "dailies");

    stores.readQuestConversation.mockResolvedValue(undefined);
    expect(
      (await headerBreadcrumbs(MEMBER, ["quests", "dailies"])).at(-1),
      "a conversation not yet started has no construct",
    ).toEqual({ label: "Dailies", quest: { id: "dailies", name: "Dailies" } });
  });

  test.each([
    { name: "a quest other than Dailies", dailies: false, status: "active" },
    { name: "a completed Dailies quest", dailies: true, status: "completed" },
  ])("$name has no construct in its crumb", async ({ dailies, status }) => {
    stores.getQuest.mockResolvedValue({
      id: "quest",
      name: "Fox",
      dailies,
      status,
    });
    expect(await headerBreadcrumbs(MEMBER, ["quests", "quest"])).toEqual([
      { label: "Quests", href: "/quests" },
      { label: "Fox", quest: { id: "quest", name: "Fox" } },
    ]);
    expect(stores.readQuestConversation).not.toHaveBeenCalled();
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

  test("historical custom constructs have no trail, and built-ins remain named", async () => {
    expect(await headerBreadcrumbs(MEMBER, ["constructs", "own"])).toEqual([]);
    expect(
      (await headerBreadcrumbs(MEMBER, ["constructs", "lumen"])).at(-1)?.label,
    ).toBe("Lumen");
  });
  test("a spell leads directly to Spellbook", async () => {
    expect(
      await headerBreadcrumbs(MEMBER, ["spellbook", "brainstorm"]),
    ).toEqual([
      { label: "Spellbook", href: "/spellbook" },
      { label: "Brainstorm" },
    ]);
  });
});
