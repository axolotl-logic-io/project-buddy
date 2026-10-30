// use_case_private_data for chats, with two users side by side: another
// user's chat, in a project or standalone, is not found, exactly as an
// unknown chat is, through the chat store, the chat API and the rename
// Server Action, and nothing of either user's changes.
import type { UIMessage } from "ai";
import { describe, expect, test } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import { renameChatAction } from "@/app/(workspace)/chats/[chatId]/actions.ts";
import type { Chat, NewMessage } from "@/chats/chat-rows.ts";
import { createStandaloneChat } from "@/chats/standalone-chat.ts";
import {
  getChat,
  listMessages,
  renameChat,
  saveMessage,
} from "@/chats/store.ts";
import { readAppErrorCase } from "@/errors/app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import type { ChatId } from "@/ids.ts";
import { chatNameFixture } from "../chats/chat-name-fixtures.ts";
import { chatIdFixture, messageIdFixture } from "../id-fixtures.ts";
import { sendChatMessage } from "../test-database/chat-test-kit.ts";
import { expectNotFound } from "../test-database/navigation-test-kit.ts";
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

// The signed-in user renames the chat with this id, as the rename form
// sends it.
function renameTo(chatId: string, name: string): Promise<unknown> {
  const form = new FormData();
  form.set("chatId", chatId);
  form.set("name", name);
  return renameChatAction({ kind: "idle" }, form);
}

describe("use_case_private_data", () => {
  // The other user reads, writes into and renames her standalone chat.
  test("another user's standalone chat and its messages are not found, and take no writes", async () => {
    const { her, other } = await twoUsers();
    const hers = await createStandaloneChat(her.id);

    expect(await getChat(other.id, hers.id)).toBeUndefined();
    expect(await listMessages(other.id, hers.id)).toEqual([]);
    expect(await saveMessage(other.id, hers.id, theirMessage())).toBe(
      "id-taken",
    );
    expect(await renameChat(other.id, hers.id, chatNameFixture("Theirs"))).toBe(
      false,
    );

    expect(await listMessages(her.id, hers.id)).toEqual([]);
    expect(await getChat(her.id, hers.id)).toEqual(hers);
  });

  test("the chat API answers another user's chat as not found", async () => {
    const { her, herData, other } = await twoUsers();
    const projectChat = await herData.chat(await herData.project());
    const { id: standaloneId } = await createStandaloneChat(her.id);
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

  test("renaming another user's chat is not found, and renames nothing", async () => {
    const { her, herData, other, otherData } = await twoUsers();
    const herChat = await herData.chat(await herData.project());
    const theirChat = await otherData.chat(await otherData.project());
    const chats: OwnedChat[] = [
      [her, herChat.id],
      [other, theirChat.id],
    ];
    const before = await readChats(chats);
    await signIn(other);

    await expectNotFound(() => renameTo(chatIdFixture(), "Mine now"));
    await expectNotFound(() => renameTo(herChat.id, "Mine now"));

    expect(await readChats(chats)).toEqual(before);
  });
});
