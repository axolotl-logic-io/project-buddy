// A chat longer than the screen, for the specs that scroll one: the pinned
// header's (chats-long-chat.spec.ts) and its switch's (hide-extras.spec.ts).
import { expect, type Page } from "@playwright/test";
import type { Chat } from "@/chats/store.ts";
import {
  chatMessages,
  lastMessage,
  openChat,
  sendMessage,
} from "./chat-page.ts";

const MARKDOWN_REPLY_HEADING = "Beveling an edge";
// The Python block that ends the reply.
const MARKDOWN_REPLY_END = "bpy.ops.mesh.bevel";

// Asks the mock tutor for its Markdown reply, a heading, lists, a table and
// code, longer than a phone's screen, and waits until the reply is shown to
// its end.
async function askForMarkdown(page: Page): Promise<void> {
  const shownBefore = await chatMessages(page).count();
  await sendMessage(page, "/mock-markdown");
  // Her message and the reply.
  await expect(chatMessages(page)).toHaveCount(shownBefore + 2);
  await expect(lastMessage(page)).toContainText(MARKDOWN_REPLY_HEADING);
  await expect(lastMessage(page).getByRole("code")).toContainText(
    MARKDOWN_REPLY_END,
  );
}

// Signs in, opens chat and fills it with replies, several screens long:
// three replies fill a laptop's screen several times over.
async function openLongChat(page: Page, chat: Pick<Chat, "id">): Promise<void> {
  await openChat(page, chat);
  await askForMarkdown(page);
  await askForMarkdown(page);
  await askForMarkdown(page);
}

// Opens the long chat that openLongChat filled, already signed in, and waits
// until it is shown to its end.
async function showLongChat(page: Page, chat: Pick<Chat, "id">): Promise<void> {
  await page.goto(`/chats/${chat.id}`);
  await expect(lastMessage(page).getByRole("code")).toContainText(
    MARKDOWN_REPLY_END,
  );
}

async function scrollToBottom(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
  await expect
    .poll(() => page.evaluate(() => window.scrollY), "scrolled down")
    .toBeGreaterThan(0);
}

export { openLongChat, scrollToBottom, showLongChat };
