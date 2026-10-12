// A project's memory page: goals, milestones as a task list and preferences,
// in two versions, one by the user and one by the tutor.
import { expect, type Locator, type Page } from "@playwright/test";
import { editMemory } from "@/memory/memory-store.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";
import type { TestData } from "../fixtures.ts";
import { ANY_VALUE, copyPattern, describeVisualPage } from "./visual-page.ts";

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

const VERSION_MADE_LINE = copyPattern(
  MEMORY_COPY.versionMade(ANY_VALUE, ANY_VALUE),
);

function history(page: Page): Locator {
  return page.getByRole("list", { name: MEMORY_COPY.historyHeading });
}

// Each version's "by <who>, <date and time>" line, which fills the rest of
// its heading row, so its box doesn't change with the date.
function versionMadeLines(page: Page): readonly Locator[] {
  return [
    history(page)
      .getByRole("listitem")
      .getByRole("paragraph")
      .filter({ hasText: VERSION_MADE_LINE }),
  ];
}

describeVisualPage({
  name: "memory",
  signedIn: true,
  open: async (page: Page, testData: TestData): Promise<void> => {
    const project = await testData.project(PROJECT_NAME);
    await editMemory(testData.account.id, {
      projectId: project.id,
      edit: { oldText: "", newText: MEMORY },
      author: "user",
    });
    await editMemory(testData.account.id, {
      projectId: project.id,
      edit: {
        oldText: `- [ ] ${MILESTONE_DONE_BY_TUTOR}`,
        newText: `- [x] ${MILESTONE_DONE_BY_TUTOR}`,
      },
      author: "tutor",
    });
    await page.goto(`/projects/${project.id}/memory`);
    await expect(
      page
        .getByRole("region", { name: MEMORY_COPY.currentLabel })
        .getByRole("checkbox"),
    ).toHaveCount(MILESTONE_COUNT);
    await expect(history(page).getByRole("listitem")).toHaveCount(
      VERSION_COUNT,
    );
  },
  changing: versionMadeLines,
});
