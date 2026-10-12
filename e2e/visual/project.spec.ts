// A project's page: a 36-character name and two chats, one named by hand and
// one not named yet.
import { expect, type Locator, type Page } from "@playwright/test";
import { chatNameFixture } from "@/chats/chat-name-fixtures.ts";
import { renameChat } from "@/chats/store.ts";
import type { TestData } from "../fixtures.ts";
import { logIn } from "../log-in.ts";
import { describeVisualPage } from "./visual-page.ts";

// A 36-character name, to show how a long name sits beside the memory link.
const PROJECT_NAME = "Low-poly fox den under autumn leaves";
const CHAT_NAME = "Bevel the den's roof";

const STARTED_LINE = /^started /u;

// Each chat card's "started <date and time>" line, which fills the card's
// width.
function startedTimes(page: Page): readonly Locator[] {
  return [page.getByRole("main").getByText(STARTED_LINE)];
}

describeVisualPage({
  name: "project",
  listsEveryProject: false,
  open: async (page: Page, testData: TestData): Promise<void> => {
    const project = await testData.project(PROJECT_NAME);
    // One after another, so the list's order, newest first, is fixed.
    const named = await testData.chat(project, "hippy");
    await renameChat(named.id, chatNameFixture(CHAT_NAME));
    await testData.chat(project, "mr-tee");
    await logIn(page);
    await page.goto(`/projects/${project.id}`);
    await expect(
      page.getByRole("heading", { level: 1, name: PROJECT_NAME }),
    ).toBeVisible();
    await expect(
      page.getByRole("main").getByRole("listitem").getByRole("link"),
    ).toHaveCount(2);
  },
  changing: startedTimes,
});
