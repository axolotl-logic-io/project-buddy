// The new-chat form, opened from a project's page, with its project chosen.
import { expect, type Page } from "@playwright/test";
import type { TestData } from "../fixtures.ts";
import { logIn } from "../log-in.ts";
import { describeVisualPage } from "./visual-page.ts";

const PROJECT_NAME = "Low-poly fox";
const PERSONA_COUNT = 6;

describeVisualPage({
  name: "new-chat",
  listsEveryProject: true,
  open: async (page: Page, testData: TestData): Promise<void> => {
    const project = await testData.project(PROJECT_NAME);
    await logIn(page);
    await page.goto(`/chats/new?projectId=${project.id}`);
    await expect(page.getByLabel("Project")).toHaveValue(project.id);
    await expect(page.getByRole("radio")).toHaveCount(PERSONA_COUNT);
  },
});
