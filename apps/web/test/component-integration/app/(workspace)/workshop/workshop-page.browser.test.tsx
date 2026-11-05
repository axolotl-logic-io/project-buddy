// The Workshop's own page in the browser: a tab for each kind, Constructs
// first, each offering New, Customize for the built-in ones, and Tweak and
// Clone for the user's own.
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import { listOwnActivities } from "@/activities/activity-store.ts";
import { listActivities } from "@/activities/index.ts";
import WorkshopPage from "@/app/(workspace)/workshop/page.tsx";
import { listConstructs } from "@/constructs/construct-store.ts";
import { listConstructs as listBuiltInConstructs } from "@/constructs/index.ts";
import { listProjects } from "@/projects/store.ts";
import { PROMPT_KINDS } from "@/prompts/prompt.ts";
import { listSpells } from "@/spells/index.ts";
import { listOwnSpells } from "@/spells/spell-store.ts";
import { ACTIVITIES_COPY } from "@/ui/copy/activities.ts";
import { GUILD_COPY } from "@/ui/copy/guild.ts";
import { SPELLBOOK_COPY } from "@/ui/copy/spells.ts";
import { WORKSHOP_COPY, WORKSHOP_PAGE_COPY } from "@/ui/copy/workshop.ts";
import {
  SIGNED_IN_USER,
  SIGNED_OUT_REDIRECT,
  signInAs,
  signOut,
} from "../../../auth/current-user-test-kit.ts";
import {
  ASK_ONE_QUESTION_CLONE,
  BRAINSTORMING_CLONE,
  VELLUM_CLONE,
} from "../../phone-pages-fixtures.ts";
import { inWorkspace } from "../../workspace-test-kit.tsx";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../../../auth/current-user-test-kit.ts"),
);
vi.mock("@/constructs/construct-store.ts", () => ({
  getOwnConstruct: vi.fn(),
  listConstructs: vi.fn<typeof listConstructs>(),
}));
vi.mock("@/activities/activity-store.ts", () => ({
  getOwnActivity: vi.fn(),
  listOwnActivities: vi.fn<typeof listOwnActivities>(),
}));
vi.mock("@/spells/spell-store.ts", () => ({
  getOwnSpell: vi.fn(),
  listOwnSpells: vi.fn<typeof listOwnSpells>(),
}));
vi.mock("@/projects/store.ts", () => ({
  getProject: vi.fn(),
  listProjects: vi.fn<typeof listProjects>(),
}));
vi.mock("@/marketplace/listing-store.ts", () => ({
  listedPromptIds: vi.fn().mockResolvedValue(new Set()),
}));
// The page offers these actions; their own pages' tests submit them.
vi.mock("@/app/(workspace)/guild/actions.ts", () => ({
  cloneConstructAction: vi.fn(),
  editBuiltInConstructAction: vi.fn(),
  newConstructAction: vi.fn(),
}));
vi.mock("@/app/(workspace)/activities/actions.ts", () => ({
  cloneActivityAction: vi.fn(),
  editBuiltInActivityAction: vi.fn(),
  newActivityAction: vi.fn(),
}));
vi.mock("@/app/(workspace)/spellbook/actions.ts", () => ({
  cloneSpellAction: vi.fn(),
  deleteSpellAction: vi.fn(),
  editBuiltInSpellAction: vi.fn(),
  newSpellAction: vi.fn(),
}));

beforeEach(() => {
  signInAs(SIGNED_IN_USER);
  vi.mocked(listConstructs).mockResolvedValue([VELLUM_CLONE]);
  vi.mocked(listOwnActivities).mockResolvedValue([BRAINSTORMING_CLONE]);
  vi.mocked(listOwnSpells).mockResolvedValue([ASK_ONE_QUESTION_CLONE]);
  vi.mocked(listProjects).mockResolvedValue([]);
});
afterEach(() => {
  vi.clearAllMocks();
});

async function showWorkshop(kind?: string): Promise<void> {
  let query = {};
  if (kind !== undefined) {
    query = { kind };
  }
  await render(
    inWorkspace(
      await WorkshopPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve(query),
      }),
    ),
  );
}

function tab(
  kind: keyof typeof WORKSHOP_PAGE_COPY.kinds,
): ReturnType<typeof page.getByRole> {
  return page
    .getByRole("navigation", { name: WORKSHOP_PAGE_COPY.kindsLabel })
    .getByRole("link", { name: WORKSHOP_PAGE_COPY.kinds[kind], exact: true });
}

describe("use_case_workshop_page", () => {
  test("shows Constructs first, with a tab for each kind", async () => {
    await showWorkshop();
    await expect
      .element(
        page.getByRole("heading", { level: 1, name: WORKSHOP_COPY.heading }),
      )
      .toBeVisible();
    await expect
      .element(tab("construct"))
      .toHaveAttribute("aria-current", "page");
    await expect.element(tab("activity")).not.toHaveAttribute("aria-current");

    const builtIn = listBuiltInConstructs()[0]?.name ?? "";
    await expect
      .element(
        page.getByRole("button", {
          name: GUILD_COPY.customizeLabel(builtIn),
        }),
      )
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: GUILD_COPY.newConstruct }))
      .toBeEnabled();
    await expect
      .element(
        page.getByRole("link", {
          name: GUILD_COPY.tweakLabel(VELLUM_CLONE.name),
        }),
      )
      .toHaveAttribute("href", `/guild/${VELLUM_CLONE.id}`);
    await expect
      .element(
        page.getByRole("button", {
          name: GUILD_COPY.cloneLabel(VELLUM_CLONE.name),
        }),
      )
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: ACTIVITIES_COPY.newActivity }))
      .not.toBeInTheDocument();
  });

  test.each(PROMPT_KINDS)("the %s tab's link opens that tab", async (kind) => {
    await showWorkshop();
    const href = tab(kind).element().getAttribute("href") ?? "";
    const target = new URL(href, globalThis.location.origin);
    expect(target.pathname).toBe("/workshop");
    await cleanup();
    await showWorkshop(target.searchParams.get("kind") ?? undefined);
    await expect.element(tab(kind)).toHaveAttribute("aria-current", "page");
  });

  test("the Activities tab offers New, Customize, Tweak and Clone for activities", async () => {
    await showWorkshop("activity");
    await expect
      .element(tab("activity"))
      .toHaveAttribute("aria-current", "page");
    const builtIn = listActivities()[0]?.name ?? "";
    await expect
      .element(
        page.getByRole("button", {
          name: ACTIVITIES_COPY.customizeLabel(builtIn),
        }),
      )
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: ACTIVITIES_COPY.newActivity }))
      .toBeEnabled();
    await expect
      .element(
        page.getByRole("link", {
          name: ACTIVITIES_COPY.tweakLabel(BRAINSTORMING_CLONE.name),
        }),
      )
      .toHaveAttribute("href", `/activities/${BRAINSTORMING_CLONE.id}`);
    await expect
      .element(
        page.getByRole("button", {
          name: ACTIVITIES_COPY.cloneLabel(BRAINSTORMING_CLONE.name),
        }),
      )
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: GUILD_COPY.newConstruct }))
      .not.toBeInTheDocument();
  });

  test("the Spells tab offers New, Customize, Tweak and Clone for spells", async () => {
    await showWorkshop("spell");
    await expect.element(tab("spell")).toHaveAttribute("aria-current", "page");
    const builtIn = listSpells()[0]?.name ?? "";
    await expect
      .element(
        page.getByRole("button", {
          name: SPELLBOOK_COPY.customizeLabel(builtIn),
        }),
      )
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: SPELLBOOK_COPY.newSpell }))
      .toBeEnabled();
    await expect
      .element(
        page.getByRole("link", {
          name: SPELLBOOK_COPY.tweakLabel(ASK_ONE_QUESTION_CLONE.name),
        }),
      )
      .toHaveAttribute("href", `/spellbook/${ASK_ONE_QUESTION_CLONE.id}`);
    await expect
      .element(
        page.getByRole("button", {
          name: SPELLBOOK_COPY.cloneLabel(ASK_ONE_QUESTION_CLONE.name),
        }),
      )
      .toBeVisible();
  });

  test("an unknown kind shows Constructs", async () => {
    await showWorkshop("dragon");
    await expect
      .element(tab("construct"))
      .toHaveAttribute("aria-current", "page");
    await expect
      .element(page.getByRole("button", { name: GUILD_COPY.newConstruct }))
      .toBeEnabled();
  });

  test("lists only the user's own, and reads nothing signed out", async () => {
    await showWorkshop();
    expect(listConstructs).toHaveBeenCalledWith(SIGNED_IN_USER.id);
    signOut();
    vi.mocked(listConstructs).mockClear();
    await expect(
      WorkshopPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow(SIGNED_OUT_REDIRECT);
    expect(listConstructs).not.toHaveBeenCalled();
  });
});
