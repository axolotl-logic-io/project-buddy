// Workshop offers the same Create, Make a copy and Edit actions for each kind.

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import { newConstructAction } from "@/app/(workspace)/constructs/actions.ts";
import WorkshopPage from "@/app/(workspace)/workshop/page.tsx";
import { listConstructs } from "@/constructs/construct-store.ts";
import { listConstructs as listBuiltInConstructs } from "@/constructs/index.ts";
import { CONSTRUCTS_COPY } from "@/ui/copy/constructs.ts";
import { WORKSHOP_PAGE_COPY } from "@/ui/copy/workshop.ts";
import { userConstructIdFixture } from "../../../../support/id-fixtures.ts";
import {
  SIGNED_IN_USER,
  SIGNED_OUT_REDIRECT,
  signInAs,
  signOut,
} from "../../../auth/current-user-test-kit.ts";
import { VELLUM_CLONE } from "../../phone-pages-fixtures.ts";
import { inWorkspace } from "../../workspace-test-kit.tsx";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../../../auth/current-user-test-kit.ts"),
);
vi.mock("@/constructs/construct-store.ts", () => ({
  getOwnConstruct: vi.fn(),
  listConstructs: vi.fn<typeof listConstructs>(),
}));
// The page offers these actions; their own pages' tests submit them.
vi.mock("@/app/(workspace)/constructs/actions.ts", () => ({
  retireConstructAction: vi.fn(),
  cloneConstructAction: vi.fn(),
  editBuiltInConstructAction: vi.fn(),
  newConstructAction: vi.fn(),
}));

const QUEST_START = /Start a quest/u;
const BUILT_IN_SPELL_NAMES = /^(?:Plan|Brainstorm)$/u;
const COPY_ACTION = /^Make a copy of /u;
const OLD_ACTION = /^(?:Craft|Customize|Clone|Tweak|Start a quest)/u;

beforeEach(() => {
  signInAs(SIGNED_IN_USER);
  vi.mocked(listConstructs).mockResolvedValue([VELLUM_CLONE]);
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
  test("use_case_view_constructs", async () => {
    await showWorkshop();
    await expect
      .element(page.getByRole("link", { name: VELLUM_CLONE.name, exact: true }))
      .toBeVisible();
    vi.mocked(listConstructs).mockResolvedValue([]);
    await cleanup();
    await showWorkshop();
    await expect.element(page.getByText(CONSTRUCTS_COPY.noOwn)).toBeVisible();
  });
  test("shows Constructs first, with a tab for each kind", async () => {
    await showWorkshop();
    await expect.element(page.getByText(CONSTRUCTS_COPY.intro)).toBeVisible();
    expect(
      page.getByRole("heading", { level: 1 }).query(),
      "the trail band, not the page, names it",
    ).toBeNull();
    await expect
      .element(tab("construct"))
      .toHaveAttribute("aria-current", "page");
    await expect
      .element(page.getByRole("link", { name: "Activities", exact: true }))
      .not.toBeInTheDocument();

    const builtIn = listBuiltInConstructs()[0]?.name ?? "";
    await Promise.all(
      [...listBuiltInConstructs(), VELLUM_CLONE].map(async (construct) => {
        await expect
          .element(
            page.getByRole("link", {
              name: construct.name,
              exact: true,
            }),
          )
          .toHaveAttribute("href", `/constructs/${construct.id}`);
      }),
    );
    await expect
      .element(page.getByRole("button", { name: QUEST_START }))
      .not.toBeInTheDocument();
    await expect
      .element(
        page.getByRole("button", {
          name: CONSTRUCTS_COPY.customizeLabel(builtIn),
        }),
      )
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: "Create construct" }))
      .toBeEnabled();
    await expect
      .element(
        page.getByRole("link", {
          name: CONSTRUCTS_COPY.tweakLabel(VELLUM_CLONE.name),
        }),
      )
      .toHaveAttribute("href", `/constructs/${VELLUM_CLONE.id}`);
    await expect
      .element(
        page.getByRole("button", {
          name: CONSTRUCTS_COPY.cloneLabel(VELLUM_CLONE.name),
        }),
      )
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: "Create activity" }))
      .not.toBeInTheDocument();
  });

  test.each(["construct", "spell"] as const)(
    "the %s tab's link opens that tab",
    async (kind) => {
      await showWorkshop();
      const href = tab(kind).element().getAttribute("href") ?? "";
      const target = new URL(href, globalThis.location.origin);
      expect(target.pathname).toBe("/workshop");
      await cleanup();
      await showWorkshop(target.searchParams.get("kind") ?? undefined);
      await expect.element(tab(kind)).toHaveAttribute("aria-current", "page");
    },
  );

  test.each([
    {
      kind: "construct",
      button: "Create construct",
      heading: "Built-in constructs",
    },
    { kind: "spell", button: "Create spell", heading: "Built-in spells" },
  ])(
    "$kind creation appears before the collection",
    async ({ kind, button, heading }) => {
      await showWorkshop(kind);
      const create = page.getByRole("button", { name: button, exact: true });
      await expect.element(create).toBeVisible();
      const collection = page.getByRole("heading", {
        name: heading,
        exact: true,
      });
      expect(
        create.element().getBoundingClientRect().bottom,
      ).toBeLessThanOrEqual(collection.element().getBoundingClientRect().top);
    },
  );

  test("the Spells tab offers built-ins with creation and copying", async () => {
    await showWorkshop("spell");
    await expect.element(tab("spell")).toHaveAttribute("aria-current", "page");
    await expect
      .element(page.getByRole("link", { name: "Activities", exact: true }))
      .not.toBeInTheDocument();
    await Promise.all(
      ["Plan", "Brainstorm"].map((name) =>
        expect
          .element(page.getByRole("link", { name, exact: true }))
          .toBeVisible(),
      ),
    );
    await expect
      .element(page.getByRole("button", { name: "Create spell" }))
      .toBeVisible();
    await expect
      .element(
        page.getByRole("button", { name: "Make a copy", exact: true }).first(),
      )
      .toBeVisible();
  });

  test("the Spells tab offers built-in spells and custom creation", async () => {
    await showWorkshop("spell");
    await expect.element(tab("spell")).toHaveAttribute("aria-current", "page");
    expect(
      page.getByRole("link", { name: BUILT_IN_SPELL_NAMES }).all(),
    ).toHaveLength(2);
    await expect
      .element(page.getByRole("link", { name: "Plan", exact: true }))
      .toHaveAttribute("href", "/spellbook/plan");
    await expect
      .element(page.getByRole("link", { name: "Brainstorm", exact: true }))
      .toHaveAttribute("href", "/spellbook/brainstorm");
  });

  test("an unknown kind shows Constructs", async () => {
    await showWorkshop("dragon");
    await expect
      .element(tab("construct"))
      .toHaveAttribute("aria-current", "page");
    await expect
      .element(page.getByRole("button", { name: "Create construct" }))
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

test("Create construct supports keyboard submission in Workshop", async () => {
  const submitted = Promise.withResolvers<void>();
  vi.mocked(newConstructAction).mockImplementation(() => {
    submitted.resolve();
    return new Promise<never>(() => undefined);
  });
  await showWorkshop();
  const create = page.getByRole("button", {
    name: "Create construct",
    exact: true,
  });
  create.element().focus();
  await expect.element(create).toHaveFocus();
  await userEvent.keyboard("{Enter}");
  await submitted.promise;
  expect(newConstructAction).toHaveBeenCalledOnce();
});

test.each(["construct"] as const)(
  "the %s collection uses the shared copy action without a quest start",
  async (kind) => {
    await showWorkshop(kind);
    const copies = page.getByRole("button", { name: COPY_ACTION }).elements();
    expect(copies.length).toBeGreaterThan(1);
    expect(copies.map((button) => button.textContent)).toEqual(
      copies.map(() => "Make a copy"),
    );
    await expect
      .element(page.getByRole("button", { name: OLD_ACTION }))
      .not.toBeInTheDocument();
  },
);

test("Workshop keeps private constructs in the store’s oldest-first order", async () => {
  vi.mocked(listConstructs).mockResolvedValue([
    { ...VELLUM_CLONE, name: "Zebra guide" },
    {
      ...VELLUM_CLONE,
      id: userConstructIdFixture("3d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f6a"),
      name: "Alpine guide",
    },
  ]);
  await showWorkshop();
  const own = page.getByRole("region", { name: CONSTRUCTS_COPY.ownHeading });
  expect(
    own
      .getByRole("link")
      .elements()
      .map((link) => link.textContent),
  ).toEqual(["Zebra guide", "Edit", "Alpine guide", "Edit"]);
});

vi.mock("@/app/(workspace)/spellbook/actions.ts", () => ({
  castSpellAction: vi.fn(),
  newSpellAction: vi.fn(),
  cloneSpellAction: vi.fn(),
  saveSpellAction: vi.fn(),
  retireSpellAction: vi.fn(),
}));
vi.mock("@/spells/own-spell-store.ts", () => ({
  findSpell: vi.fn().mockResolvedValue(undefined),
  listOwnSpells: vi.fn().mockResolvedValue([]),
}));
