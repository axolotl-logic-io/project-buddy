// The all-chats hub: two standalone conversations, a project chat between
// them with a badge, the project filter and an owned new-chat buddy.
import { expect, type Locator, type Page } from "@playwright/test";
import { cloneBuddy } from "@/buddies/buddy-store.ts";
import { getBuddy } from "@/buddies/index.ts";
import { createCentralChat } from "@/chats/central-chat.ts";
import { renameChat } from "@/chats/store.ts";
import { STANDALONE_CHATS_COPY } from "@/ui/copy/chat.ts";
import { PROJECT_COPY } from "@/ui/copy/projects.ts";
import { chatNameFixture } from "../../test/chats/chat-name-fixtures.ts";
import type { TestData } from "../fixtures.ts";
import { ANY_VALUE, copyPattern, describeVisualPage } from "./visual-page.ts";

const CHAT_NAME = "A fox for the garden";
const PROJECT_NAME = "Low-poly fox den";
const STARTED_LINE = copyPattern(PROJECT_COPY.chatStarted(ANY_VALUE));

function startedDates(page: Page): readonly Locator[] {
  return [page.getByRole("main").getByText(STARTED_LINE)];
}

describeVisualPage({
  name: "standalone-chats",
  signedIn: true,
  changing: startedDates,
  open: async (page: Page, testData: TestData): Promise<void> => {
    const owner = testData.account.id;
    const first = await createCentralChat(owner);
    await renameChat(owner, first.id, chatNameFixture(CHAT_NAME));
    await testData.chat(await testData.project(PROJECT_NAME), "hippy");
    await createCentralChat(owner, getBuddy("mr-tee"));
    await cloneBuddy(owner, "hippy");
    await page.goto("/chat");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: STANDALONE_CHATS_COPY.heading,
      }),
    ).toBeVisible();
  },
});
