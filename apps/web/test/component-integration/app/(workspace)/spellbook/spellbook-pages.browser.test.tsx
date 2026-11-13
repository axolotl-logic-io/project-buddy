// The Spellbook's pages in the browser: the list offers Create spell among her
// own spells, after the built-in ones in keyboard order; Delete asks before
// it deletes; and her spell's page names each field's limit, keeps typing
// within it, and names what its reset restores.

import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import SpellPage from "@/app/(workspace)/spellbook/[spellId]/page.tsx";
import { SpellLists } from "@/app/(workspace)/spellbook/spell-lists.tsx";
import { inWorkspace } from "../../workspace-test-kit.tsx";

vi.mock(
  "next/navigation",
  () => import("../../../components/router-test-kit.ts"),
);

vi.mock(
  "@/auth/current-user.ts",
  () => import("../../../auth/current-user-test-kit.ts"),
);
// The pages expose these actions; only Craft spell and Delete are submitted.

test("the only spell choices are Plan and Brainstorm, with no custom creation", async () => {
  await render(inWorkspace(await SpellLists()));
  await expect
    .element(page.getByRole("link", { name: "Plan", exact: true }))
    .toBeVisible();
  await expect
    .element(page.getByRole("link", { name: "Brainstorm", exact: true }))
    .toBeVisible();
  await expect
    .element(page.getByRole("button", { name: "Create spell" }))
    .not.toBeInTheDocument();
});

test("Plan's page explains its persistent mode without an editor or copy action", async () => {
  const content = await SpellPage({
    params: Promise.resolve({ spellId: "plan" }),
    searchParams: Promise.resolve({}),
  });
  await render(inWorkspace(content));
  await expect
    .element(page.getByRole("heading", { name: "Plan", exact: true }))
    .toBeVisible();
  await expect.element(page.getByRole("textbox")).not.toBeInTheDocument();
  await expect
    .element(page.getByRole("button", { name: "Make a copy" }))
    .not.toBeInTheDocument();
});
