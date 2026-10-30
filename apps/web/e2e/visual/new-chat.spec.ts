// The new chat page, with a project chosen by its projectId parameter,
// the open chat as its activity and Hippy as its buddy.
import { expect, type Page } from "@playwright/test";
import { getBuddy } from "@/buddies/index.ts";
import { NEW_CHAT_COPY } from "@/ui/copy/chat.ts";
import type { TestData } from "../fixtures.ts";
import { describeVisualPage } from "./visual-page.ts";

const PROJECT_NAME = "Low-poly fox";

describeVisualPage({
  name: "new-chat",
  signedIn: true,
  open: async (page: Page, testData: TestData): Promise<void> => {
    const project = await testData.project(PROJECT_NAME);
    await page.goto(`/chats/new?projectId=${project.id}`);
    await expect(page.getByLabel(NEW_CHAT_COPY.projectLabel)).toHaveValue(
      project.id,
    );
    await expect(page.getByText(getBuddy("hippy").description)).toBeVisible();
  },
});
