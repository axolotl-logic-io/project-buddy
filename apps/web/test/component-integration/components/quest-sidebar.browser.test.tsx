import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
  PlanPanel,
  QuestSidebarSection,
} from "@/components/plan/plan-panel.tsx";

const DRAFT_LABEL = "Idea draft";
const CONVERSATION = "Conversation content";

test("the accordion retains a draft across collapse and all three sizes", async () => {
  await render(
    <PlanPanel
      initialSection="ideas"
      sideContent={
        <QuestSidebarSection value="ideas" name="Ideas">
          <label>
            {DRAFT_LABEL}
            <input />
          </label>
        </QuestSidebarSection>
      }
    >
      <p>{CONVERSATION}</p>
    </PlanPanel>,
  );
  const draft = page.getByLabelText(DRAFT_LABEL);
  await draft.fill("Try clay");
  await page.getByRole("button", { name: "Ideas", exact: true }).click();
  await expect.element(draft).not.toBeVisible();
  await page.getByRole("button", { name: "Ideas", exact: true }).click();
  await expect.element(draft).toHaveValue("Try clay");
  await page.getByRole("button", { name: "Minimize", exact: true }).click();
  await expect.element(draft).not.toBeVisible();
  await expect.element(page.getByText("Conversation content")).toBeVisible();
  await page.getByRole("button", { name: "Medium", exact: true }).click();
  await expect.element(draft).toHaveValue("Try clay");
  await page.getByRole("button", { name: "Full screen", exact: true }).click();
  await expect
    .element(page.getByText("Conversation content"))
    .not.toBeVisible();
  await expect.element(draft).toBeVisible();
  await page.getByRole("button", { name: "Medium", exact: true }).click();
  await expect.element(page.getByText("Conversation content")).toBeVisible();
});
