// use_case_private_data for chats, with two users side by side: another
// user's chat, in a project or standalone, is not found, exactly as an
// unknown chat is, through the chat store and the chat API, and nothing of
// either user's changes.
import type { UIMessage } from "ai";
import { describe, expect, test } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import type { Chat, NewMessage } from "@/chats/chat-rows.ts";
import { getChat, listMessages, saveMessage } from "@/chats/store.ts";
import { privateChat } from "@/conversations/private-chat.ts";
import { readAppErrorCase } from "@/errors/app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import type { ChatId } from "@/ids.ts";
import { chatIdFixture, messageIdFixture } from "../../support/id-fixtures.ts";
import { sendChatMessage } from "../test-database/chat-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";
import { twoUsers } from "../test-database/two-users-test-kit.ts";

const QUESTION = "Whose chat is this?";

// A chat as its owner reads it, with its messages.
interface ReadChat {
  readonly chat: Chat | undefined;
  readonly messages: readonly UIMessage[];
}

// A message the other user tries to save into her standalone chat.
function theirMessage(): NewMessage {
  return {
    id: messageIdFixture(),
    role: "user",
    parts: [{ type: "text", text: "Mine now" }],
  };
}

// A chat's owner and id.
type OwnedChat = readonly [User, ChatId];

// Each chat, as its owner reads it, with its messages.
function readChats(chats: readonly OwnedChat[]): Promise<ReadChat[]> {
  return Promise.all(
    chats.map(
      async ([owner, chatId]): Promise<ReadChat> => ({
        chat: await getChat(owner.id, chatId),
        messages: await listMessages(owner.id, chatId),
      }),
    ),
  );
}

describe("use_case_private_data", () => {
  // The other user reads and writes into her private Chat.
  test("another user's standalone chat and its messages are not found, and take no writes", async () => {
    const { her, other } = await twoUsers();
    const hers = await privateChat(her.id);

    expect(await getChat(other.id, hers.id)).toBeUndefined();
    expect(await listMessages(other.id, hers.id)).toEqual([]);
    expect(await saveMessage(other.id, hers.id, theirMessage())).toBe(
      "id-taken",
    );

    expect(await listMessages(her.id, hers.id)).toEqual([]);
    expect((await getChat(her.id, hers.id))?.id).toBe(hers.id);
  });

  test("the chat API answers another user's chat as not found", async () => {
    const { her, herData, other } = await twoUsers();
    const projectChat = await herData.chat(await herData.project());
    const { id: standaloneId } = await privateChat(her.id);
    const herChats: OwnedChat[] = [
      [her, projectChat.id],
      [her, standaloneId],
    ];
    const before = await readChats(herChats);
    await signIn(other);
    const unknown = await sendChatMessage(chatIdFixture(), QUESTION);

    expect(unknown.status).toBe(HTTP_STATUS.notFound);
    expect(readAppErrorCase(unknown.body)).toBe("not-found");
    expect(await sendChatMessage(projectChat.id, QUESTION)).toEqual(unknown);
    expect(await sendChatMessage(standaloneId, QUESTION)).toEqual(unknown);
    expect(await readChats(herChats)).toEqual(before);
  });
});
