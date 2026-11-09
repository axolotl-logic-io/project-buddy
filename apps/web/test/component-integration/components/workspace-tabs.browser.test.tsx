import { expect, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { PageWorkspace } from "@/components/page-workspace.tsx";
import { WorkspaceTabs } from "@/components/workspace-tabs.tsx";

const MODE_LABEL = "Dark mode";

test("keyboard section changes retain a draft and hide inactive controls", async () => {
  await render(
    <PageWorkspace title="Settings">
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
