import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import BuddyPage from "@/app/(workspace)/buddies/[buddyId]/page.tsx";
import type { getUserBuddy, UserBuddy } from "@/buddies/buddy-store.ts";
import { getBuddy } from "@/buddies/index.ts";
import {
  BUDDIES_COPY,
  BUDDY_COPY,
  BUDDY_PARTS_COPY,
} from "@/ui/copy/buddies.ts";
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
  getUserBuddy: vi.fn<typeof getUserBuddy>(),
}));
vi.mock("@/buddies/buddy-store.ts", () => store);

vi.mock("next/navigation", () => ({
  notFound: (): never => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const OWN_BUDDY: UserBuddy = {
  id: userBuddyIdFixture(),
  name: "Mr. Tee (clone)",
  parts: { ...getBuddy("mr-tee").parts, voice: "Pity the fool." },
  clonedFrom: "mr-tee",
  createdAt: new Date("2026-10-12T09:00:00Z"),
  updatedAt: new Date("2026-10-12T09:00:00Z"),
};

const MEMORY_TAGS = /<project_memory>/u;

// Each part's field on the page, by its part key, as the extra it is in:
// "persona-mechanics" and "interview-persona" are stored flag ids (cookie and
// account data), kept through the buddy rename (#116).
// the mechanics parts in persona-mechanics, which Settings hides by
// default, and the buddy's own parts in none.
const EXPECTED_EXTRAS: Readonly<Record<string, string | null>> = {
  voice: null,
  teachingRules: null,
  role: null,
  brainstorming: "brainstorming",
  projectBreakdown: "project-breakdown",
  sharedRules: "persona-mechanics",
  citation: "persona-mechanics",
  interview: "persona-mechanics",
  centralChat: "persona-mechanics",
  memoryIntro: "persona-mechanics",
  emptyMemory: "persona-mechanics",
  searchManualTool: "persona-mechanics",
  citeManualTool: "persona-mechanics",
  updateMemoryTool: "persona-mechanics",
  createProjectTool: "persona-mechanics",
  openingKickoff: "persona-mechanics",
  neutralKickoff: "persona-mechanics",
  answerNow: "persona-mechanics",
};

// The extra each part's field is in on the rendered page, by part key.
function renderedExtras(): Record<string, string | null> {
  return Object.fromEntries(
    Object.entries(BUDDY_PARTS_COPY).map(([key, { label }]) => [
      key,
      screen
        .getByRole("textbox", { name: label })
        .closest("[data-extra]")
        ?.getAttribute("data-extra") ?? null,
    ]),
  );
}

// The page for the buddy with this id.
async function renderPage(buddyId: string): Promise<void> {
  render(
    await BuddyPage({
      params: Promise.resolve({ buddyId }),
      searchParams: Promise.resolve({}),
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  signInAs(SIGNED_IN_USER);
  store.getUserBuddy.mockResolvedValue(OWN_BUDDY);
});

describe("use_case_customize_built_in_buddy", () => {
  test("shows a built-in buddy's parts read-only, with Customize", async () => {
    await renderPage("hippy");

    expect(
      screen.getByRole("heading", { level: 1, name: "Hippy" }),
    ).toBeInTheDocument();
    const voice = screen.getByRole("textbox", {
      name: BUDDY_PARTS_COPY.voice.label,
    });
    expect(voice).toHaveValue(getBuddy("hippy").parts.voice);
    expect(voice).toHaveAttribute("readonly");
    expect(
      screen.getByRole("button", { name: BUDDIES_COPY.customize }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: BUDDY_COPY.save }),
    ).not.toBeInTheDocument();
    expect(store.getUserBuddy).not.toHaveBeenCalled();
  });

  test("puts the mechanics parts, and only them, in the persona-mechanics extra", async () => {
    await renderPage("hippy");

    expect(renderedExtras()).toEqual(EXPECTED_EXTRAS);
  });
});

// Her buddy's name and parts, to edit.
function herPartTests(): void {
  test("shows her buddy's name and every part to edit, each with a reset", async () => {
    await renderPage(OWN_BUDDY.id);

    expect(store.getUserBuddy).toHaveBeenCalledWith(
      SIGNED_IN_USER.id,
      OWN_BUDDY.id,
    );
    expect(
      screen.getByRole("textbox", { name: BUDDY_COPY.nameLabel }),
    ).toHaveValue(OWN_BUDDY.name);
    for (const [key, { label }] of Object.entries(BUDDY_PARTS_COPY)) {
      const field = screen.getByRole("textbox", { name: label });
      expect(field).not.toHaveAttribute("readonly");
      expect(field).toHaveAttribute("name", key);
      const reset = screen.getByRole("button", {
        name: BUDDY_COPY.resetLabel(label),
      });
      if (!(reset instanceof HTMLButtonElement) || reset.form === null) {
        throw new Error("The reset needs its form");
      }
      expect(new FormData(reset.form).get("part")).toBe(key);
    }
    expect(
      screen.getByRole("textbox", { name: BUDDY_PARTS_COPY.voice.label }),
    ).toHaveValue("Pity the fool.");
  });

  test("warns that a mechanics part can break citations, memory or search", async () => {
    await renderPage(OWN_BUDDY.id);

    expect(
      screen.getByRole("textbox", { name: BUDDY_PARTS_COPY.citation.label }),
    ).toHaveAccessibleDescription(
      expect.stringContaining(BUDDY_COPY.mechanicsWarning),
    );
    for (const key of ["voice", "brainstorming", "projectBreakdown"] as const) {
      expect(
        screen.getByRole("textbox", { name: BUDDY_PARTS_COPY[key].label }),
      ).not.toHaveAccessibleDescription(
        expect.stringContaining(BUDDY_COPY.mechanicsWarning),
      );
    }
  });
}

// Her buddy's hints.
function hintTests(): void {
  test("says {{name}} becomes her name in the parts of the system prompt alone", async () => {
    await renderPage(OWN_BUDDY.id);

    for (const label of [
      BUDDY_PARTS_COPY.voice.label,
      BUDDY_PARTS_COPY.role.label,
      BUDDY_PARTS_COPY.brainstorming.label,
      BUDDY_PARTS_COPY.projectBreakdown.label,
      BUDDY_PARTS_COPY.emptyMemory.label,
    ]) {
      expect(
        screen.getByRole("textbox", { name: label }),
      ).toHaveAccessibleDescription(expect.stringContaining("{{name}}"));
    }
    for (const label of [
      BUDDY_PARTS_COPY.searchManualTool.label,
      BUDDY_PARTS_COPY.openingKickoff.label,
      BUDDY_PARTS_COPY.answerNow.label,
    ]) {
      expect(
        screen.getByRole("textbox", { name: label }),
      ).not.toHaveAccessibleDescription(expect.stringContaining("{{name}}"));
    }
  });
}

// What no buddy changes, shown read-only.
function fixedPartTests(): void {
  test("shows the parts no buddy changes", async () => {
    await renderPage(OWN_BUDDY.id);

    expect(screen.getByText(BUDDY_COPY.dynamicHeading)).toBeInTheDocument();
    expect(screen.getByText("search_manual: query")).toBeInTheDocument();
    expect(screen.getByText("create_project: name")).toBeInTheDocument();
    expect(screen.getByText(MEMORY_TAGS)).toBeInTheDocument();
  });
}

// Her buddy's mechanics parts, which Settings hides by default.
function mechanicsPartTests(): void {
  test("puts the mechanics parts and their resets, and only them, in the persona-mechanics extra", async () => {
    await renderPage(OWN_BUDDY.id);

    expect(renderedExtras()).toEqual(EXPECTED_EXTRAS);
    expect(
      screen
        .getByRole("button", {
          name: BUDDY_COPY.resetLabel(BUDDY_PARTS_COPY.citation.label),
        })
        .closest("[data-extra]"),
    ).toHaveAttribute("data-extra", "persona-mechanics");
  });
}

describe("use_case_reset_buddy_part", () => {
  herPartTests();
});

describe("use_case_edit_buddy", () => {
  describe("Buddy page's hints for her own buddy", () => {
    hintTests();
  });
  describe("Buddy page's fixed parts for her own buddy", () => {
    fixedPartTests();
  });
  describe("Buddy page's mechanics parts for her own buddy", () => {
    mechanicsPartTests();
  });
});
