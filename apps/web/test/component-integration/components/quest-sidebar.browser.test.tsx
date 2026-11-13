import { describe, expect, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { PlanPanel } from "@/components/plan/plan-panel.tsx";
import { applyTheme } from "../themes/theme-test-kit.ts";
import {
  measureTargets,
  pageScrollWidth,
  smallTargets,
} from "../touch-targets-test-kit.ts";
import {
  LAPTOP_VIEWPORT,
  NARROWEST_VIEWPORT,
  PHONE_VIEWPORT,
  setViewport,
} from "../viewports-test-kit.ts";

const PLAN_CONTENT = "Plan steps";
const PROGRESS_CONTENT = "Recorded milestones";
const MESSAGE_LABEL = "Message";
const DRAFT_LABEL = "Idea draft";

async function sidebar(initialSection?: string): Promise<void> {
  await render(
    <PlanPanel
      initialSection={initialSection}
      sideSections={[
        { id: "plan", label: "Plan", content: <p>{PLAN_CONTENT}</p> },
        {
          id: "ideas",
          label: "Ideas",
          content: (
            <label>
              {DRAFT_LABEL}
              <input className="input-field" />
            </label>
          ),
        },
        {
          id: "progress",
          label: "Progress",
          content: <p>{PROGRESS_CONTENT}</p>,
        },
      ]}
    >
      <label>
        {MESSAGE_LABEL}
        <input className="input-field" />
      </label>
    </PlanPanel>,
  );
}

describe.each(["light", "dark"])("sidebar in %s", (mode) => {
  test.each([NARROWEST_VIEWPORT, PHONE_VIEWPORT, LAPTOP_VIEWPORT])(
    "docks flush, retains edits and restores focus at $width px",
    async (viewport) => {
      applyTheme("parchment", mode);
      await setViewport(viewport);
      await sidebar("ideas");
      const draft = page.getByLabelText(DRAFT_LABEL);
      await draft.fill("Try clay");
      await page.getByRole("tab", { name: "Plan", exact: true }).click();
      await expect.element(draft).not.toBeVisible();
      await page.getByRole("tab", { name: "Ideas", exact: true }).click();
      await expect.element(draft).toHaveValue("Try clay");
      const panel = page.getByRole("dialog", { name: "Quest side menu" });
      const bounds = panel.element().getBoundingClientRect();
      expect(bounds.right).toBe(viewport.width);
      expect(bounds.bottom).toBe(viewport.height);
      expect(pageScrollWidth()).toBeLessThanOrEqual(viewport.width);
      expect(smallTargets(await measureTargets())).toEqual([]);
      await page
        .getByRole("button", { name: "Collapse quest sidebar" })
        .click();
      const toggle = page.getByRole("button", { name: "Open quest sidebar" });
      await expect.element(draft).not.toBeVisible();
      await expect.element(toggle).toHaveFocus();
      await expect.element(page.getByLabelText("Message")).toBeVisible();
      await toggle.click();
      await expect.element(draft).toHaveValue("Try clay");
    },
  );
});

test("a phone starts with the conversation and Escape closes its drawer", async () => {
  await setViewport(PHONE_VIEWPORT);
  await sidebar();
  const toggle = page.getByRole("button", { name: "Open quest sidebar" });
  await expect.element(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await page.getByRole("tab", { name: "Ideas", exact: true }).click();
  await page.getByLabelText(DRAFT_LABEL).fill("Keep this draft");
  await userEvent.keyboard("{Escape}");
  await expect.element(toggle).toHaveFocus();
  await toggle.click();
  await expect
    .element(page.getByLabelText(DRAFT_LABEL))
    .toHaveValue("Keep this draft");
});

test("sidebar tabs switch with arrow keys and show one section at a time", async () => {
  await setViewport(LAPTOP_VIEWPORT);
  await sidebar("plan");
  const plan = page.getByRole("tab", { name: "Plan", exact: true });
  await expect.element(plan).toHaveAttribute("aria-selected", "true");
  await expect
    .element(page.getByRole("tabpanel"))
    .toHaveTextContent("Plan steps");
  await plan.click();
  await userEvent.keyboard("{ArrowRight}");
  await expect.element(page.getByRole("tab", { name: "Ideas" })).toHaveFocus();
  await expect.element(page.getByLabelText(DRAFT_LABEL)).toBeVisible();
  await userEvent.keyboard("{ArrowRight}");
  await expect
    .element(page.getByRole("tabpanel"))
    .toHaveTextContent("Recorded milestones");
  await expect.element(page.getByLabelText(DRAFT_LABEL)).not.toBeVisible();
});
