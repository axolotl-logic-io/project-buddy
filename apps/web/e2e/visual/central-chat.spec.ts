// A standalone conversation with one exchange and a link back to Chats
// above its name. The chat is stored through the chat store as it
// would be saved after her message and the mock tutor's reply, and the shot
// is of the chat as it opens from the database.
import { expect, type Page } from "@playwright/test";
import { createCentralChat } from "@/chats/central-chat.ts";
import { renameChat } from "@/chats/store.ts";
import { chatNameFixture } from "../../test/chats/chat-name-fixtures.ts";
import { chatMessages } from "../chat-page.ts";
import type { TestData } from "../fixtures.ts";
import { describeVisualPage } from "./visual-page.ts";

const CHAT_NAME = "A fox for the garden";
const MESSAGE =
  "I'd like to model a low-poly fox. Is that a good first project?";
const REPLY =
  "A low-poly fox is a fine first project: a few hundred faces, one material and a simple pose. Start from a cube, and shape the body before the head.";
// Her message and its reply.
const MESSAGE_COUNT = 2;

describeVisualPage({
  name: "central-chat",
  signedIn: true,
  open: async (page: Page, testData: TestData): Promise<void> => {
    const owner = testData.account.id;
    const chat = await createCentralChat(owner);
    // Named by hand, so the tutor's automatic names never change it.
    await renameChat(owner, chat.id, chatNameFixture(CHAT_NAME));
    await testData.exchanges(chat, [
      { message: MESSAGE, reply: [{ type: "text", text: REPLY }] },
    ]);
    await page.goto(`/chats/${chat.id}`);
    await expect(chatMessages(page)).toHaveCount(MESSAGE_COUNT);
  },
});
