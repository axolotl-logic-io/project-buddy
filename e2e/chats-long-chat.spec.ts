// A chat longer than the screen: the way back to the project, the chat's
// name and the composer stay on screen and in reach wherever she has
// scrolled to, on a laptop and on a phone.
import { expect, type Locator, type Page } from "@playwright/test";
import { chatNameFixture } from "@/chats/chat-name-fixtures.ts";
import { renameChat } from "@/chats/store.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import {
  chatMessages,
  lastMessage,
  openChat,
  sendMessage,
} from "./chat-page.ts";
import { test } from "./fixtures.ts";
import { LAPTOP_VIEWPORT, PHONE_VIEWPORT } from "./viewports.ts";

const PROJECT_NAME = "Low-poly fox den";
const CHAT_NAME = "Beveling the den's roof";
const MARKDOWN_REPLY_HEADING = "Beveling an edge";

// Asks the mock tutor for its Markdown reply, a heading, lists, a table and
// code, longer than a phone's screen, and waits for it.
async function askForMarkdown(page: Page): Promise<void> {
  await sendMessage(page, "/mock-markdown");
  await expect(lastMessage(page)).toContainText(MARKDOWN_REPLY_HEADING);
}

async function scrollToBottom(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
  await expect
    .poll(() => page.evaluate(() => window.scrollY), "scrolled down")
    .toBeGreaterThan(0);
}

// Checks that target is wholly on screen and that a click would reach it,
// not something drawn over it.
async function expectReachable(target: Locator): Promise<void> {
  await expect(target).toBeInViewport({ ratio: 1 });
  await target.click({ trial: true });
}

// Jumps to target, as a link to it would, and checks that it starts below
// pinned rather than under it.
async function expectJumpLandsBelow(
  target: Locator,
  pinned: Locator,
): Promise<void> {
  await target.evaluate((element) => {
    element.scrollIntoView({ block: "start" });
  });
  const targetBox = await target.boundingBox();
  const pinnedBox = await pinned.boundingBox();
  if (targetBox === null || pinnedBox === null) {
    throw new Error("The jump's target or the pinned element is not shown");
  }
  expect(targetBox.y).toBeGreaterThanOrEqual(pinnedBox.y + pinnedBox.height);
}

test.describe("use_case_breadcrumbs_in_long_chat", () => {
  for (const viewport of [LAPTOP_VIEWPORT, PHONE_VIEWPORT]) {
    test(`${viewport.width} px wide`, async ({ page, testData }) => {
      const project = await testData.project(PROJECT_NAME);
      const chat = await testData.chat(project);
      await renameChat(chat.id, chatNameFixture(CHAT_NAME));
      await page.setViewportSize(viewport);
      await openChat(page, chat);
      await askForMarkdown(page);
      await askForMarkdown(page);
      await askForMarkdown(page);

      const backLink = page.getByRole("link", { name: PROJECT_NAME });
      const chatName = page.getByRole("heading", { level: 1, name: CHAT_NAME });
      await scrollToBottom(page);
      await expectReachable(backLink);
      await expectReachable(chatName);
      await expectReachable(
        page.getByRole("textbox", { name: CHAT_COPY.messageLabel }),
      );

      await expectJumpLandsBelow(chatMessages(page).first(), chatName);

      await scrollToBottom(page);
      await backLink.click();
      await expect(page).toHaveURL(`/projects/${project.id}`);
    });
  }
});
