// The new-chat form, opened from a project's page, with its project chosen.
import { expect, type Page } from "@playwright/test";
import { NEW_CHAT_COPY } from "@/ui/copy/chat.ts";
import type { TestData } from "../fixtures.ts";
import { describeVisualPage } from "./visual-page.ts";

const PROJECT_NAME = "Low-poly fox";
const PERSONA_COUNT = 6;

describeVisualPage({
  name: "new-chat",
  signedIn: true,
  open: async (page: Page, testData: TestData): Promise<void> => {
    const project = await testData.project(PROJECT_NAME);
    await page.goto(`/chats/new?projectId=${project.id}`);
    await expect(page.getByLabel(NEW_CHAT_COPY.projectLabel)).toHaveValue(
      project.id,
    );
    await expect(page.getByRole("radio")).toHaveCount(PERSONA_COUNT);
  },
});
