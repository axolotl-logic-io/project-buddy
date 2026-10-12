// A project's memory page: goals, milestones as a task list and preferences,
// in two versions, one by the user and one by the tutor.
import { expect, type Locator, type Page } from "@playwright/test";
import { editMemory } from "@/memory/memory-store.ts";
import type { TestData } from "../fixtures.ts";
import { logIn } from "../log-in.ts";
import { describeVisualPage } from "./visual-page.ts";

const PROJECT_NAME = "Low-poly fox den";
const MILESTONE_DONE_BY_TUTOR = "Bevel the roof's edges";
const MEMORY = [
  "## Goals",
  "",
  "- Model a low-poly fox den for a game.",
  "- Learn to bevel and to use the Mirror modifier.",
  "",
  "## Milestones",
  "",
  "- [x] Block out the den's shape",
  `- [ ] ${MILESTONE_DONE_BY_TUTOR}`,
  "- [ ] Add materials",
  "",
  "## Preferences",
  "",
  "- Short steps, one shortcut at a time.",
].join("\n");
const MILESTONE_COUNT = 3;
const VERSION_COUNT = 2;

const VERSION_MADE_LINE = /^by (?:you|the tutor), /u;

// Each version's heading line: its number, and who made it and when. The
// whole line is covered, because the date's own box is as wide as its text,
// which changes with the date and the time.
function versionHeadingLines(page: Page): readonly Locator[] {
  return [page.getByRole("main").getByText(VERSION_MADE_LINE).locator("..")];
}

describeVisualPage({
  name: "memory",
  listsEveryProject: false,
  open: async (page: Page, testData: TestData): Promise<void> => {
    const project = await testData.project(PROJECT_NAME);
    await editMemory({
      projectId: project.id,
      edit: { oldText: "", newText: MEMORY },
      author: "user",
    });
    await editMemory({
      projectId: project.id,
      edit: {
        oldText: `- [ ] ${MILESTONE_DONE_BY_TUTOR}`,
        newText: `- [x] ${MILESTONE_DONE_BY_TUTOR}`,
      },
      author: "tutor",
    });
    await logIn(page);
    await page.goto(`/projects/${project.id}/memory`);
    await expect(
      page
        .getByRole("region", { name: "Current memory" })
        .getByRole("checkbox"),
    ).toHaveCount(MILESTONE_COUNT);
    await expect(
      page.getByRole("list", { name: "History" }).getByRole("listitem"),
    ).toHaveCount(VERSION_COUNT);
  },
  changing: versionHeadingLines,
});
