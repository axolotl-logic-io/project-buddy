import { beforeEach, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import RetiredDefinitionPage from "@/app/(workspace)/retirement/[promptId]/page.tsx";
import {
  deleteRetiredDefinitionAction,
  restoreDefinitionAction,
} from "@/app/(workspace)/retirement/actions.ts";
import RetirementPage from "@/app/(workspace)/retirement/page.tsx";
import {
  getRetiredDefinition,
  listRetiredDefinitions,
} from "@/retirement/retirement-store.ts";
import { RETIREMENT_COPY } from "@/ui/copy/retirement.ts";
import { inWorkspace } from "../app/workspace-test-kit.tsx";
import { SIGNED_IN_USER, signInAs } from "../auth/current-user-test-kit.ts";
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

test("Delete forever names the definition, supports cancellation, and submits only after confirmation", async () => {
  const submitted = Promise.withResolvers<FormData>();
  vi.mocked(deleteRetiredDefinitionAction).mockImplementation((form) => {
    submitted.resolve(form);
    return new Promise<never>(() => undefined);
  });
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
  await dialog
    .getByRole("button", { name: RETIREMENT_COPY.delete, exact: true })
    .click();
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
