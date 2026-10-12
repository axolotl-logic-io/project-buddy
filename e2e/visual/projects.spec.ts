// The projects list with three projects, and the list with none after a new
// project's opening failed (as in start-without-claude.spec.ts).
import { expect, type Locator, type Page } from "@playwright/test";
import type { TestData } from "../fixtures.ts";
import { logIn } from "../log-in.ts";
import { describeVisualPage } from "./visual-page.ts";

const PROJECT_NAMES = [
  "Donut with sprinkles",
  "Low-poly fox",
  "A cosy cabin in the woods at dusk",
] as const;

// The mock tutor fails the opening of a project whose name holds this.
const UNAVAILABLE_PROJECT_NAME = "Fox den /mock-error overloaded_error";

const STARTED_LINE = /^started /u;

// Each project card's "started <date>" line, which fills the card's width.
function startedDates(page: Page): readonly Locator[] {
  return [page.getByRole("main").getByText(STARTED_LINE)];
}

describeVisualPage({
  name: "projects",
  listsEveryProject: true,
  open: async (page: Page, testData: TestData): Promise<void> => {
    // One after another, so the list's order, newest first, is fixed.
    await testData.project(PROJECT_NAMES[0]);
    await testData.project(PROJECT_NAMES[1]);
    await testData.project(PROJECT_NAMES[2]);
    await logIn(page);
    await page.goto("/projects");
    await expect(
      page.getByRole("main").getByRole("listitem").getByRole("link"),
    ).toHaveText([...PROJECT_NAMES].reverse());
  },
  changing: startedDates,
});

describeVisualPage({
  name: "new-project-unavailable",
  listsEveryProject: true,
  open: async (page: Page): Promise<void> => {
    await logIn(page);
    await page.goto("/projects");
    await page
      .getByRole("textbox", { name: "Project name" })
      .fill(UNAVAILABLE_PROJECT_NAME);
    await page.getByRole("button", { name: "Create project" }).click();
    // Next's route announcer is an alert too, outside the main landmark.
    await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
  },
});
