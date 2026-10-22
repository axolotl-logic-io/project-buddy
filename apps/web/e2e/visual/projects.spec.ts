// The projects list with three projects, and the list with none after a new
// project's opening failed (as in
// test/chats/start-without-claude.server.test.ts).
import { expect, type Locator, type Page } from "@playwright/test";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";
import type { TestData } from "../fixtures.ts";
import { fillWhenReady } from "../page-helpers.ts";
import { ANY_VALUE, copyPattern, describeVisualPage } from "./visual-page.ts";

const PROJECT_NAMES = [
  "Donut with sprinkles",
  "Low-poly fox",
  "A cosy cabin in the woods at dusk",
] as const;

// The mock tutor fails the opening of a project whose name holds this.
const UNAVAILABLE_PROJECT_NAME = "Fox den /mock-error overloaded_error";

const STARTED_LINE = copyPattern(PROJECTS_COPY.created(ANY_VALUE));

// Each project card's "started <date>" line, which fills the card's width.
function startedDates(page: Page): readonly Locator[] {
  return [page.getByRole("main").getByText(STARTED_LINE)];
}

describeVisualPage({
  name: "projects",
  signedIn: true,
  open: async (page: Page, testData: TestData): Promise<void> => {
    // Explicit dates keep newest-first order independent of the database
    // clock: sequential inserts need not have strictly increasing timestamps.
    await Promise.all([
      testData.project(PROJECT_NAMES[0], new Date("2026-10-01T09:00:00Z")),
      testData.project(PROJECT_NAMES[1], new Date("2026-10-02T09:00:00Z")),
      testData.project(PROJECT_NAMES[2], new Date("2026-10-03T09:00:00Z")),
    ]);
    await page.goto("/projects");
    await expect(
      page.getByRole("main").getByRole("listitem").getByRole("link"),
    ).toHaveText([...PROJECT_NAMES].reverse());
  },
  changing: startedDates,
});

describeVisualPage({
  name: "new-project-unavailable",
  signedIn: true,
  open: async (page: Page): Promise<void> => {
    await page.goto("/projects");
    await fillWhenReady(
      page.getByRole("textbox", { name: PROJECTS_COPY.nameLabel }),
      UNAVAILABLE_PROJECT_NAME,
    );
    await page.getByRole("button", { name: PROJECTS_COPY.create }).click();
    const main = page.getByRole("main");
    // Next's route announcer is an alert too, outside the main landmark.
    await expect(main.getByRole("alert")).toBeVisible();
    // The list, streamed in after its loading skeleton.
    await expect(main.getByText(PROJECTS_COPY.none)).toBeVisible();
  },
});
