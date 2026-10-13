// A project's page: a 36-character name, its interview link, and two chats,
// one named by hand, its interview chat, and one not named yet.
import { expect, type Locator, type Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import { chatNameFixture } from "@/chats/chat-name-fixtures.ts";
import { renameChat } from "@/chats/store.ts";
import { getDb } from "@/db/client.ts";
import { projects } from "@/db/tables/projects-and-chats.ts";
import { PROJECT_COPY } from "@/ui/copy/projects.ts";
import type { TestData } from "../fixtures.ts";
import { ANY_VALUE, copyPattern, describeVisualPage } from "./visual-page.ts";

// A 36-character name, to show how a long name sits beside the interview and
// memory links.
const PROJECT_NAME = "Low-poly fox den under autumn leaves";
const CHAT_NAME = "Bevel the den's roof";

const STARTED_LINE = copyPattern(PROJECT_COPY.chatStarted(ANY_VALUE));

// Each chat card's "started <date and time>" line, which fills the card's
// width.
function startedTimes(page: Page): readonly Locator[] {
  return [page.getByRole("main").getByText(STARTED_LINE)];
}

describeVisualPage({
  name: "project",
  signedIn: true,
  open: async (page: Page, testData: TestData): Promise<void> => {
    const project = await testData.project(PROJECT_NAME);
    // One after another, so the list's order, newest first, is fixed.
    const named = await testData.chat(project, "hippy");
    await renameChat(testData.account.id, named.id, chatNameFixture(CHAT_NAME));
    await getDb()
      .update(projects)
      .set({ interviewChatId: named.id })
      .where(eq(projects.id, project.id));
    await testData.chat(project, "mr-tee");
    await page.goto(`/projects/${project.id}`);
    await expect(
      page.getByRole("heading", { level: 1, name: PROJECT_NAME }),
    ).toBeVisible();
    await expect(
      page.getByRole("main").getByRole("listitem").getByRole("link"),
    ).toHaveCount(2);
    await expect(
      page.getByRole("link", { name: PROJECT_COPY.interviewLink }),
    ).toBeVisible();
  },
  changing: startedTimes,
});
