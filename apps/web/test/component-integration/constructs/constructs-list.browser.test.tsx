import { beforeEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { listActivities } from "@/activities/index.ts";
import ConstructsPage from "@/app/(workspace)/constructs/(list)/page.tsx";
import { newConstructAction } from "@/app/(workspace)/constructs/actions.ts";
import { startQuestAction } from "@/app/(workspace)/projects/actions.ts";
import {
  listConstructs,
  type OwnConstruct,
} from "@/constructs/construct-store.ts";
import { questCreationChoices } from "@/projects/quest-creation-choices.ts";
import { listRetiredDefinitions } from "@/retirement/retirement-store.ts";
import { CONSTRUCTS_COPY } from "@/ui/copy/constructs.ts";
import { QUEST_START_COPY } from "@/ui/copy/projects.ts";
import { RETIREMENT_COPY } from "@/ui/copy/retirement.ts";
import { START_WORK_COPY } from "@/ui/copy/start-work.ts";
import { userConstructIdFixture } from "../../support/id-fixtures.ts";
import { VELLUM_CLONE } from "../app/phone-pages-fixtures.ts";
import { inWorkspace } from "../app/workspace-test-kit.tsx";
import { SIGNED_IN_USER, signInAs } from "../auth/current-user-test-kit.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../auth/current-user-test-kit.ts"),
);
vi.mock("@/constructs/construct-store.ts", () => ({
  listConstructs: vi.fn<typeof listConstructs>(),
}));
// Listing exposes these actions; only Craft construct is submitted, from the
// keyboard.
vi.mock("@/app/(workspace)/constructs/actions.ts", () => ({
  cloneConstructAction: vi.fn(),
  editBuiltInConstructAction: vi.fn(),
  newConstructAction: vi.fn(),
  retireConstructAction: vi.fn(),
}));

vi.mock("@/projects/quest-creation-choices.ts", () => ({
  questCreationChoices: vi.fn<typeof questCreationChoices>(),
}));
vi.mock("@/app/(workspace)/projects/actions.ts", () => ({
  startQuestAction: vi.fn<typeof startQuestAction>(),
}));
const BUILT_INS = [
  { id: "vellum", name: "Vellum" },
  { id: "lumen", name: "Lumen" },
];
// The store supplies oldest first; the page must retain that order, not
// sort by name. Database ownership and ordering remain server-test concerns.
const OWN_CONSTRUCTS: OwnConstruct[] = [
  { ...VELLUM_CLONE, name: "Zebra guide" },
  {
    ...VELLUM_CLONE,
    id: userConstructIdFixture("3d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f6a"),
    name: "Alpine guide",
    createdAt: new Date("2026-10-13T09:00:00Z"),
  },
];

beforeEach(() => {
  vi.mocked(questCreationChoices).mockResolvedValue({
    activities: listActivities(),
    userConstructs: OWN_CONSTRUCTS.map(({ id, name }) => ({ id, name })),
    preferredConstructId: "vellum",
  });
  vi.mocked(startQuestAction).mockClear();
});

test("use_case_view_constructs", async () => {
  signInAs(SIGNED_IN_USER);
  vi.mocked(listConstructs).mockResolvedValue(OWN_CONSTRUCTS);
  const screen = await render(
    inWorkspace(
      await ConstructsPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({}),
      }),
    ),
  );
  const builtIn = page.getByRole("tabpanel", { name: "Built-in", exact: true });
  const own = page.getByRole("tabpanel", { name: "Yours", exact: true });

  await expect
    .element(
      page.getByRole("heading", {
        level: 1,
        name: CONSTRUCTS_COPY.heading,
      }),
    )
    .toBeVisible();
  await expect.element(page.getByText(CONSTRUCTS_COPY.intro)).toBeVisible();
  expect(page.getByRole("tabpanel").elements()).toEqual([builtIn.element()]);
  expect(builtIn.getByRole("listitem").elements()).toHaveLength(
    BUILT_INS.length,
  );
  await Promise.all(
    BUILT_INS.map(async (construct) => {
      await expect
        .element(
          builtIn.getByRole("button", {
            name: CONSTRUCTS_COPY.startLabel(construct.name),
            exact: true,
          }),
        )
        .toBeEnabled();
      await expect
        .element(
          builtIn.getByRole("button", {
            name: CONSTRUCTS_COPY.customizeLabel(construct.name),
            exact: true,
          }),
        )
        .toBeEnabled();
    }),
  );
  await page.getByRole("tab", { name: "Yours", exact: true }).click();
  expect(own.getByRole("listitem").elements()).toHaveLength(
    OWN_CONSTRUCTS.length,
  );
  expect(
    own
      .getByRole("button")
      .elements()
      .filter((button) => button.hasAttribute("aria-haspopup"))
      .map((button) => button.textContent),
  ).toEqual(
    OWN_CONSTRUCTS.map((construct) =>
      CONSTRUCTS_COPY.startLabel(construct.name),
    ),
  );

  expect(
    own
      .getByRole("link")
      .elements()
      .map((link) => link.textContent),
  ).toEqual([CONSTRUCTS_COPY.tweak, CONSTRUCTS_COPY.tweak]);
  await Promise.all(
    OWN_CONSTRUCTS.map(async (construct) => {
      await expect
        .element(
          own.getByRole("button", {
            name: CONSTRUCTS_COPY.startLabel(construct.name),
            exact: true,
          }),
        )
        .toBeEnabled();
      await expect
        .element(
          own.getByRole("link", {
            name: CONSTRUCTS_COPY.tweakLabel(construct.name),
            exact: true,
          }),
        )
        .toHaveAttribute("href", `/constructs/${construct.id}`);
      await expect
        .element(
          own.getByRole("button", {
            name: CONSTRUCTS_COPY.cloneLabel(construct.name),
            exact: true,
          }),
        )
        .toBeEnabled();
    }),
  );
  await expect
    .element(own.getByText(CONSTRUCTS_COPY.noOwn))
    .not.toBeInTheDocument();
  await expect
    .element(page.getByRole("button", { name: "Craft construct" }))
    .toBeEnabled();

  vi.mocked(listConstructs).mockResolvedValue([]);
  await screen.rerender(
    inWorkspace(
      await ConstructsPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({}),
      }),
    ),
  );
  await expect.element(own.getByText(CONSTRUCTS_COPY.noOwn)).toBeVisible();
  await expect
    .element(page.getByRole("button", { name: "Craft construct" }))
    .toBeEnabled();
  expect(own.getByRole("listitem").elements()).toEqual([]);
  await page.getByRole("tab", { name: "Built-in", exact: true }).click();
  expect(builtIn.getByRole("listitem").elements()).toHaveLength(
    BUILT_INS.length,
  );
});

test("the header Craft construct action supports keyboard submission", async () => {
  signInAs(SIGNED_IN_USER);
  vi.mocked(listConstructs).mockResolvedValue([]);
  const submitted = Promise.withResolvers<void>();
  // The action redirects; here it only says it was submitted.
  vi.mocked(newConstructAction).mockImplementation(() => {
    submitted.resolve();
    return new Promise<never>(() => undefined);
  });
  await render(
    inWorkspace(
      await ConstructsPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({}),
      }),
    ),
  );
  page
    .getByRole("button", { name: "Craft construct", exact: true })
    .element()
    .focus();
  await expect
    .element(page.getByRole("button", { name: "Craft construct" }))
    .toHaveFocus();
  await userEvent.keyboard("{Enter}");

  await submitted.promise;
  expect(newConstructAction).toHaveBeenCalledOnce();
});

// Built-in and own titles must start with the clicked construct, including a
// non-default built-in, rather than silently falling back to Vellum.
describe("a construct's start action", () => {
  test.each([...BUILT_INS, ...OWN_CONSTRUCTS])(
    "$name opens the quest start from its title with that construct chosen",
    async (construct) => {
      signInAs(SIGNED_IN_USER);
      vi.mocked(listConstructs).mockResolvedValue(OWN_CONSTRUCTS);
      const submitted = Promise.withResolvers<FormData>();
      vi.mocked(startQuestAction).mockImplementation((_state, form) => {
        submitted.resolve(form);
        return new Promise<never>(() => undefined);
      });
      await render(
        inWorkspace(
          await ConstructsPage({
            params: Promise.resolve({}),
            searchParams: Promise.resolve({}),
          }),
        ),
      );
      if (OWN_CONSTRUCTS.some((own) => own.id === construct.id)) {
        await page.getByRole("tab", { name: "Yours", exact: true }).click();
      }
      const label = CONSTRUCTS_COPY.startLabel(construct.name);
      const trigger = page.getByRole("button", { name: label, exact: true });
      await expect.element(trigger).toHaveTextContent(label);
      await trigger.click();
      const doIt = page.getByRole("dialog", { name: "Do a thing" });
      await expect
        .element(doIt.getByRole("button", { name: QUEST_START_COPY.start }))
        .toBeVisible();
      // The starting point takes focus as it opens; Escape closes the dialog
      // holding focus.
      await expect
        .poll(() => doIt.element().contains(document.activeElement))
        .toBe(true);
      await userEvent.keyboard("{Escape}");
      await expect.element(doIt).not.toBeInTheDocument();
      await expect
        .element(
          page.getByRole("dialog", {
            name: START_WORK_COPY.constructDialogHeading(construct.name),
          }),
        )
        .toBeVisible();
      await userEvent.keyboard("{Escape}");
      await expect.element(trigger).toHaveFocus();
      expect(startQuestAction).not.toHaveBeenCalled();

      await userEvent.keyboard("{Enter}");
      await doIt
        .getByRole("button", { name: QUEST_START_COPY.start, exact: true })
        .click();
      const sent = await submitted.promise;
      expect(sent.get("constructId")).toBe(construct.id);
      expect(sent.get("premadeId")).toBe("do");
    },
  );
});

test("crafting a construct is distinct from starting with an own construct named New construct", async () => {
  signInAs(SIGNED_IN_USER);
  vi.mocked(listConstructs).mockResolvedValue([
    { ...VELLUM_CLONE, name: "New construct" },
  ]);
  await render(
    inWorkspace(
      await ConstructsPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({}),
      }),
    ),
  );
  await page.getByRole("tab", { name: "Yours", exact: true }).click();
  const own = page.getByRole("tabpanel", { name: "Yours", exact: true });
  const start = own.getByRole("button", {
    name: CONSTRUCTS_COPY.startLabel("New construct"),
    exact: true,
  });
  const craft = page.getByRole("button", {
    name: "Craft construct",
    exact: true,
  });
  await expect.element(start).toBeVisible();
  await expect.element(craft).toBeVisible();
  expect(start.element().getAttribute("aria-haspopup")).toBe("dialog");
  expect(craft.element()).toHaveAttribute("type", "submit");
  expect(craft.element().textContent).not.toBe(start.element().textContent);
});

test("the Retired tab shows only constructs and keeps their restore action", async () => {
  signInAs(SIGNED_IN_USER);
  vi.mocked(listConstructs).mockResolvedValue([]);
  vi.mocked(listRetiredDefinitions).mockResolvedValueOnce([
    {
      id: VELLUM_CLONE.id,
      kind: "construct",
      name: "Retired guide",
      retiredAt: new Date(0),
      boughtFrom: null,
    },
    {
      id: userConstructIdFixture(),
      kind: "spell",
      name: "Retired spell",
      retiredAt: new Date(0),
      boughtFrom: null,
    },
  ]);
  await render(
    inWorkspace(
      await ConstructsPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({}),
      }),
    ),
  );
  await page.getByRole("tab", { name: "Retired", exact: true }).click();
  await expect
    .element(page.getByRole("heading", { name: "Retired guide" }))
    .toBeVisible();
  await expect
    .element(page.getByRole("heading", { name: "Retired spell" }))
    .not.toBeInTheDocument();
  await expect
    .element(
      page.getByRole("button", {
        name: RETIREMENT_COPY.restoreLabel("Retired guide"),
      }),
    )
    .toBeVisible();
});
