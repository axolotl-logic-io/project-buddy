import { beforeEach, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import RetiredDefinitionPage from "@/app/(workspace)/retirement/[promptId]/page.tsx";
import {
  deleteRetiredDefinitionAction,
  restoreDefinitionAction,
} from "@/app/(workspace)/retirement/actions.ts";
import RetirementPage from "@/app/(workspace)/retirement/page.tsx";
import { RetirementList } from "@/app/(workspace)/retirement/retirement-list.tsx";
import {
  getRetiredDefinition,
  listRetiredDefinitions,
} from "@/retirement/retirement-store.ts";
import { RETIREMENT_COPY } from "@/ui/copy/retirement.ts";
import { inWorkspace } from "../app/workspace-test-kit.tsx";
import { SIGNED_IN_USER, signInAs } from "../auth/current-user-test-kit.ts";
import { paintOf, tokenColor } from "../components/ui/button-fill-test-kit.ts";
import { applyTheme } from "../themes/theme-test-kit.ts";
import { pageScrollWidth } from "../touch-targets-test-kit.ts";
import {
  NARROWEST_VIEWPORT,
  PHONE_VIEWPORT,
  setViewport,
} from "../viewports-test-kit.ts";
import {
  RETIRED_CONSTRUCT,
  RETIRED_DEFINITIONS,
} from "./retirement-fixtures.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../auth/current-user-test-kit.ts"),
);
vi.mock("@/retirement/retirement-store.ts", () => ({
  getRetiredDefinition: vi.fn<typeof getRetiredDefinition>(),
  listRetiredDefinitions: vi.fn<typeof listRetiredDefinitions>(),
}));
vi.mock("@/app/(workspace)/retirement/actions.ts", () => ({
  deleteRetiredDefinitionAction: vi.fn<typeof deleteRetiredDefinitionAction>(),
  restoreDefinitionAction: vi.fn<typeof restoreDefinitionAction>(),
}));
beforeEach(() => {
  signInAs(SIGNED_IN_USER);
  vi.mocked(listRetiredDefinitions).mockResolvedValue([...RETIRED_DEFINITIONS]);
  vi.mocked(getRetiredDefinition).mockResolvedValue(RETIRED_CONSTRUCT);
  vi.mocked(deleteRetiredDefinitionAction).mockReset();
  vi.mocked(restoreDefinitionAction).mockReset();
});
async function renderRetirement(): Promise<void> {
  await render(
    inWorkspace(
      await RetirementPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({}),
      }),
    ),
  );
}

test("use_case_view_retirement", async () => {
  await renderRetirement();
  expect(page.getByRole("listitem").elements()).toHaveLength(
    RETIRED_DEFINITIONS.length,
  );
  await page
    .getByRole("button", { name: RETIREMENT_COPY.kinds.spell, exact: true })
    .click();
  expect(page.getByRole("listitem").elements()).toHaveLength(1);
  await expect
    .element(page.getByText("Explore three alternatives", { exact: true }))
    .toBeVisible();
  await page
    .getByRole("searchbox", { name: RETIREMENT_COPY.search })
    .fill("Moss");
  await expect.element(page.getByText(RETIREMENT_COPY.noMatches)).toBeVisible();
  await page.getByRole("button", { name: RETIREMENT_COPY.allKinds }).click();
  await expect
    .element(page.getByText(RETIRED_CONSTRUCT.name, { exact: true }))
    .toBeVisible();
  await expect
    .element(
      page.getByRole("link", {
        name: RETIREMENT_COPY.viewLabel(RETIRED_CONSTRUCT.name),
      }),
    )
    .toHaveAttribute("href", `/retirement/${RETIRED_CONSTRUCT.id}`);
});

test("a definition page's Retired tab lists its own kind with no kind filter", async () => {
  await render(
    inWorkspace(
      <RetirementList definitions={RETIRED_DEFINITIONS} kind="construct" />,
    ),
  );
  expect(page.getByRole("listitem").elements()).toHaveLength(
    RETIRED_DEFINITIONS.filter((definition) => definition.kind === "construct")
      .length,
  );
  await expect
    .element(page.getByText(RETIRED_CONSTRUCT.name, { exact: true }))
    .toBeVisible();
  await expect
    .element(page.getByRole("button", { name: RETIREMENT_COPY.allKinds }))
    .not.toBeInTheDocument();
  await expect
    .element(page.getByRole("group", { name: RETIREMENT_COPY.kindFilter }))
    .not.toBeInTheDocument();
});

test("Delete forever names the definition, supports cancellation, and submits only after confirmation", async () => {
  const submitted = Promise.withResolvers<FormData>();
  vi.mocked(deleteRetiredDefinitionAction).mockImplementation((form) => {
    submitted.resolve(form);
    return new Promise<never>(() => undefined);
  });
  applyTheme("parchment");
  await renderRetirement();
  const trigger = page.getByRole("button", {
    name: RETIREMENT_COPY.deleteLabel(RETIRED_CONSTRUCT.name),
  });
  await trigger.click();
  const dialog = page.getByRole("alertdialog", {
    name: RETIREMENT_COPY.deleteTitle(RETIRED_CONSTRUCT.name),
  });
  await expect
    .element(dialog.getByRole("button", { name: RETIREMENT_COPY.keep }))
    .toHaveFocus();
  await userEvent.keyboard("{Enter}");
  await expect.element(dialog).not.toBeInTheDocument();
  expect(deleteRetiredDefinitionAction).not.toHaveBeenCalled();
  await expect.element(trigger).toHaveFocus();
  await trigger.click();
  await expect
    .element(dialog.getByText(RETIREMENT_COPY.marketplace, { exact: false }))
    .toBeVisible();
  const deleteForever = dialog.getByRole("button", {
    name: RETIREMENT_COPY.delete,
    exact: true,
  });
  expect(paintOf(deleteForever.element()).fill).toBe(tokenColor("danger"));
  await deleteForever.click();
  expect((await submitted.promise).get("promptId")).toBe(RETIRED_CONSTRUCT.id);
});

test("the read-only retired view shows its saved instructions and restores the same definition", async () => {
  const submitted = Promise.withResolvers<FormData>();
  vi.mocked(restoreDefinitionAction).mockImplementation((form) => {
    submitted.resolve(form);
    return new Promise<never>(() => undefined);
  });
  await render(
    inWorkspace(
      await RetiredDefinitionPage({
        params: Promise.resolve({ promptId: RETIRED_CONSTRUCT.id }),
        searchParams: Promise.resolve({}),
      }),
    ),
  );
  await expect
    .element(
      page.getByRole("heading", { level: 1, name: RETIRED_CONSTRUCT.name }),
    )
    .toBeVisible();
  await expect
    .element(page.getByText("Voice: calm and curious.", { exact: false }))
    .toBeVisible();
  expect(page.getByRole("textbox").elements()).toHaveLength(0);
  await page
    .getByRole("button", {
      name: RETIREMENT_COPY.restoreLabel(RETIRED_CONSTRUCT.name),
    })
    .click();
  expect((await submitted.promise).get("promptId")).toBe(RETIRED_CONSTRUCT.id);
});

test("an empty Retirement explains where retired things will appear", async () => {
  vi.mocked(listRetiredDefinitions).mockResolvedValue([]);
  await renderRetirement();
  await expect.element(page.getByText(RETIREMENT_COPY.empty)).toBeVisible();
});

const LONG_NAME_REPEATS = 4;
const TOUCH_TARGET_PX = 44;
for (const viewport of [NARROWEST_VIEWPORT, PHONE_VIEWPORT]) {
  const { width } = viewport;
  for (const mode of ["light", "dark"] as const) {
    test(`Retirement names and search remain readable at ${width}px in ${mode}`, async () => {
      applyTheme("parchment", mode);
      await setViewport(viewport);
      const name = "A very long retired construct name".repeat(
        LONG_NAME_REPEATS,
      );
      vi.mocked(listRetiredDefinitions).mockResolvedValue([
        { ...RETIRED_CONSTRUCT, name },
      ]);
      await renderRetirement();
      const heading = page.getByRole("heading", { name, level: 2 }).element();
      expect(heading.getBoundingClientRect().width).toBeGreaterThan(width / 2);
      const search = page
        .getByRole("searchbox", { name: RETIREMENT_COPY.search })
        .element();
      expect(search.getBoundingClientRect().height).toBeGreaterThanOrEqual(
        TOUCH_TARGET_PX,
      );
      expect(
        Number.parseFloat(getComputedStyle(search).borderTopWidth),
      ).toBeGreaterThan(0);
      expect(
        Number.parseFloat(getComputedStyle(search).paddingLeft),
      ).toBeGreaterThan(0);
      expect(pageScrollWidth()).toBeLessThanOrEqual(width);
    });
  }
}
