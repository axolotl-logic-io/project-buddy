// The header's trail for each path: the Timer's public trails, Home and
// the signed-in sections, and what a quest or rite page's crumb names. The
// stores are stand-ins, so a foreign or unknown id reads as missing, as the
// acting-user stores answer it.

import { beforeEach, describe, expect, test, vi } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import {
  headerBreadcrumbs,
  publicBreadcrumbs,
} from "@/components/header-breadcrumbs.ts";
import { getConstruct } from "@/constructs/index.ts";
import { parseUserId } from "@/ids.ts";

const stores = vi.hoisted(() => ({
  getQuest: vi.fn(),
  readRite: vi.fn(),
}));
vi.mock("@/quests/store.ts", () => ({ getQuest: stores.getQuest }));
vi.mock("@/rites/rite-store.ts", () => ({ readRite: stores.readRite }));

const USER = parseUserId("00000000-0000-4000-8000-000000000001");

// The fixture user, signed in.
function signedIn(): Pick<User, "id" | "role"> {
  if (USER === undefined) {
    throw new Error("Invalid fixture user");
  }
  return { id: USER, role: "user" };
}

const MEMBER = signedIn();
const HOME = { label: "Home", href: "/" };
const QUESTS = { label: "Quests", href: "/quests" };
// A schedule that started at the Unix epoch, so it is running now.
const RUNNING = ["timer", "25", "15", "0"];
const DAY_MS = 86_400_000;
const RUNNING_TRAIL = [
  { label: "Timer", href: "/timer" },
  {
    label: "Work 25 · Break 15",
    timer: { workMinutes: 25, breakMinutes: 15, startMs: 0 },
  },
];

beforeEach(() => {
  vi.resetAllMocks();
});

describe("header breadcrumbs", () => {
  test("Home is the root, and Quests sits under it", async () => {
    expect(await headerBreadcrumbs(MEMBER, [])).toEqual([{ label: "Home" }]);
    expect(await headerBreadcrumbs(MEMBER, ["quests"])).toEqual([
      HOME,
      { label: "Quests" },
    ]);
  });

  test.each([
    { section: "grimoire", label: "Grimoire" },
    { section: "profile", label: "Profile" },
    { section: "settings", label: "Settings" },
    { section: "timer", label: "Timer" },
  ])("$label is a top-level destination", async ({ section, label }) => {
    expect(await headerBreadcrumbs(MEMBER, [section])).toEqual([{ label }]);
  });

  test("a timer link sits under Timer, named by its durations, and carries its running schedule", async () => {
    expect(await headerBreadcrumbs(MEMBER, RUNNING)).toEqual(RUNNING_TRAIL);
    expect(await headerBreadcrumbs(MEMBER, ["timer", "25", "16", "0"])).toEqual(
      [{ label: "Timer", href: "/timer" }, { label: "Unknown timer" }],
    );
    expect(await headerBreadcrumbs(MEMBER, ["timer", "25"])).toEqual([]);
  });

  test("a timer link whose start is still ahead carries no schedule", async () => {
    const later = String(Date.now() + DAY_MS);
    expect(
      await headerBreadcrumbs(MEMBER, ["timer", "25", "15", later]),
    ).toEqual([
      { label: "Timer", href: "/timer" },
      { label: "Work 25 · Break 15" },
    ]);
  });

  test("a signed-out visitor gets the Timer's trails and no other", () => {
    expect(publicBreadcrumbs(["timer"])).toEqual([{ label: "Timer" }]);
    expect(publicBreadcrumbs(RUNNING)).toEqual(RUNNING_TRAIL);
    expect(publicBreadcrumbs(["timer", "x", "y", "z"])).toEqual([
      { label: "Timer", href: "/timer" },
      { label: "Unknown timer" },
    ]);
    for (const path of [
      ["quests"],
      ["quests", "x"],
      [],
      ["grimoire"],
      ["settings"],
    ]) {
      expect(publicBreadcrumbs(path)).toEqual([]);
    }
    expect(stores.getQuest).not.toHaveBeenCalled();
    expect(stores.readRite).not.toHaveBeenCalled();
  });

  test("an active quest's crumb carries its construct", async () => {
    stores.getQuest.mockResolvedValue({
      id: "mornings",
      name: "Mornings",
      status: "active",
      constructId: "vellum",
    });
    expect(await headerBreadcrumbs(MEMBER, ["quests", "mornings"])).toEqual([
      HOME,
      QUESTS,
      {
        label: "Mornings",
        quest: { id: "mornings", name: "Mornings" },
        construct: getConstruct("vellum"),
      },
    ]);
    expect(stores.getQuest).toHaveBeenCalledWith(USER, "mornings");
  });

  test.each([
    { name: "a completed quest", status: "completed" },
    { name: "an abandoned quest", status: "abandoned" },
  ])("$name has no construct in its crumb", async ({ status }) => {
    stores.getQuest.mockResolvedValue({
      id: "quest",
      name: "Fox",
      status,
      constructId: "lumen",
    });
    expect(await headerBreadcrumbs(MEMBER, ["quests", "quest"])).toEqual([
      HOME,
      QUESTS,
      { label: "Fox", quest: { id: "quest", name: "Fox" } },
    ]);
  });

  test("a rite leads to the Grimoire, and a new rite is named New rite", async () => {
    stores.readRite.mockResolvedValue({ id: "brainstorm", name: "Brainstorm" });
    expect(await headerBreadcrumbs(MEMBER, ["grimoire", "brainstorm"])).toEqual(
      [{ label: "Grimoire", href: "/grimoire" }, { label: "Brainstorm" }],
    );
    expect(stores.readRite).toHaveBeenCalledWith(USER, "brainstorm", true);
    expect(await headerBreadcrumbs(MEMBER, ["grimoire", "new"])).toEqual([
      { label: "Grimoire", href: "/grimoire" },
      { label: "New rite" },
    ]);
  });

  test("only a built-in construct has a trail, under Home and Quests, which names it", async () => {
    expect(await headerBreadcrumbs(MEMBER, ["constructs", "unknown"])).toEqual(
      [],
    );
    expect(await headerBreadcrumbs(MEMBER, ["constructs", "lumen"])).toEqual([
      HOME,
      QUESTS,
      { label: "Lumen" },
    ]);
  });

  test("exposes no private name or parent for foreign or unknown ids", async () => {
    stores.getQuest.mockResolvedValue(undefined);
    stores.readRite.mockResolvedValue(undefined);
    const trails = await Promise.all(
      [
        "quests",
        "grimoire",
        "constructs",
        "profile",
        "settings",
        "missing",
      ].map((section) => headerBreadcrumbs(MEMBER, [section, "foreign"])),
    );
    expect(trails).toEqual(trails.map(() => []));
    expect(stores.getQuest).toHaveBeenCalledWith(USER, "foreign");
    expect(stores.readRite).toHaveBeenCalledWith(USER, "foreign", true);
    expect(await headerBreadcrumbs(MEMBER, ["missing"])).toEqual([]);
  });

  test("quest subpages and deeper paths have no trail", async () => {
    stores.getQuest.mockResolvedValue({
      id: "quest",
      name: "Fox",
      status: "active",
      constructId: "lumen",
    });
    expect(
      await headerBreadcrumbs(MEMBER, ["quests", "quest", "memory"]),
    ).toEqual([]);
    expect(
      await headerBreadcrumbs(MEMBER, ["grimoire", "brainstorm", "edit"]),
    ).toEqual([]);
    expect(stores.getQuest).not.toHaveBeenCalled();
  });
});
