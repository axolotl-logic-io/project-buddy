import { expect, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { PageWorkspace } from "@/components/page-workspace.tsx";
import { WorkspaceTabs } from "@/components/workspace-tabs.tsx";
import { applyTheme } from "../themes/theme-test-kit.ts";

const MODE_LABEL = "Dark mode";
const GENERAL = "Your preferences";
const LOOKS = "Light, dark or system";

test("keyboard section changes retain a draft and hide inactive controls", async () => {
  await render(
    <PageWorkspace>
      <WorkspaceTabs
        label="Sections"
        sections={[
          {
            id: "general",
            label: "General",
            content: <input aria-label="Draft" defaultValue="Original" />,
          },
          {
            id: "appearance",
            label: "Appearance",
            content: <button type="button">{MODE_LABEL}</button>,
          },
        ]}
      />
    </PageWorkspace>,
  );
  const draft = page.getByRole("textbox", { name: "Draft" });
  await draft.fill("Keep this change");
  page.getByRole("tab", { name: "General" }).element().focus();
  await userEvent.keyboard("{ArrowRight}");
  await expect
    .element(page.getByRole("tab", { name: "Appearance" }))
    .toHaveFocus();
  await expect
    .element(page.getByRole("button", { name: "Dark mode" }))
    .toBeVisible();
  await expect.element(draft).not.toBeInTheDocument();
  await userEvent.keyboard("{Home}");
  await expect.element(draft).toHaveValue("Keep this change");
  await expect
    .element(page.getByRole("button", { name: "Dark mode" }))
    .not.toBeInTheDocument();
});

// Radix focuses a tab from script on a click, which browsers ring like
// keyboard focus (#875). Keyboard focus keeps its ring, also after a click.
test("a clicked tab shows no focus ring, and a tab reached by keyboard does", async () => {
  applyTheme("parchment");
  await render(
    <PageWorkspace>
      <WorkspaceTabs
        label="Sections"
        sections={[
          { id: "general", label: "General", content: <p>{GENERAL}</p> },
          { id: "appearance", label: "Appearance", content: <p>{LOOKS}</p> },
        ]}
      />
    </PageWorkspace>,
  );
  const general = page.getByRole("tab", { name: "General" });
  const appearance = page.getByRole("tab", { name: "Appearance" });
  await appearance.click();
  await expect.element(appearance).toHaveFocus();
  await expect.element(appearance).toHaveAttribute("aria-selected", "true");
  expect(getComputedStyle(appearance.element()).outlineStyle).toBe("none");

  await userEvent.keyboard("{ArrowLeft}");
  await expect.element(general).toHaveFocus();
  expect(getComputedStyle(general.element()).outlineStyle).not.toBe("none");
});
