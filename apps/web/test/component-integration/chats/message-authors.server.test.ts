// "use_case_chat_with_several_people" in use-cases/chats.md, against the
// test database: a chat records who wrote each user message, reads a message
// saved with no author as the chat owner's, and, once more than one person
// has written in it, sends each user turn to the construct with its author's
// name. A chat only its owner writes in sends exactly what it sent before.
// Another person's messages, saved while quests could be shared, are
// written through the test kit.
// How the names are put on the turns is checked in author-names.test.ts,
// and the chat screen in message-authors.browser.test.tsx.

import { and, eq } from "drizzle-orm";
import { describe, expect, test } from "vitest";
import { saveUserName, type User } from "@/accounts/users-store.ts";
import type { QuestChat } from "@/chats/chat-rows.ts";
import {
  type MessageAuthor,
  otherAuthorNames,
} from "@/chats/message-author.ts";
import { listMessages } from "@/chats/store.ts";
import { privateChat } from "@/conversations/private-chat.ts";
import { getDb } from "@/db/client.ts";
import { messages } from "@/db/tables/quests-and-chats.ts";
import type { ChatId } from "@/ids.ts";
import { SEVERAL_AUTHORS_RULES } from "@/replies/global-prompt.ts";
import {
  type Exchange,
  testData,
} from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { mockReplyText } from "../replies/mock-markdown-test-kit.ts";
import {
  constructPrompt,
  constructReply,
  messageText,
  sendToEnd,
} from "../test-database/chat-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

const REPLY: Exchange["reply"] = [{ type: "text", text: "Great work." }];

// The author of each message in the owner's chat, oldest first: undefined
// for the construct's.
async function authorsIn(
  owner: User,
  chat: { readonly id: ChatId },
): Promise<(MessageAuthor | undefined)[]> {
  return (await listMessages(owner.id, chat.id)).map(
    ({ metadata }) => metadata?.author,
  );
}

// The author ids saved in the chat's messages, oldest first.
async function savedAuthorIds(chat: {
  readonly id: ChatId;
}): Promise<(string | null)[]> {
  const rows = await getDb()
    .select({ userId: messages.userId })
    .from(messages)
    .where(eq(messages.chatId, chat.id))
    .orderBy(messages.createdAt, messages.id);
  return rows.map(({ userId }) => userId);
}

// Forgets the author of every message in the chat, as on messages saved
// before authors were recorded.
async function forgetAuthors(chat: { readonly id: ChatId }): Promise<void> {
  await getDb()
    .update(messages)
    .set({ userId: null })
    .where(and(eq(messages.chatId, chat.id), eq(messages.role, "user")));
}

// The owner, named Sam, with a chat in a new quest, and Alex, another
// user with no name.
async function samAndAlex(): Promise<{
  sam: User;
  alex: User;
  chat: QuestChat;
}> {
  const [sam, alex] = await Promise.all([testUser(), testUser()]);
  await saveUserName(sam.id, "Sam");
  const data = testData(sam);
  const chat = await data.chat(await data.quest());
  return { sam, alex, chat };
}

describe("use_case_chat_with_several_people", () => {
  test("each user message records the person who sent it", async () => {
    const { sam, alex, chat } = await samAndAlex();
    await testData(sam).exchanges(chat, [
      { message: "The flipper loops are fixed.", reply: REPLY, author: alex },
    ]);
    await sendToEnd(sam, chat, "Nice. Can we look at the shell next?");

    expect(await savedAuthorIds(chat)).toStrictEqual([
      alex.id,
      null,
      sam.id,
      null,
    ]);
    expect(await authorsIn(sam, chat)).toStrictEqual([
      { id: alex.id, name: undefined, email: alex.email },
      undefined,
      { id: sam.id, name: "Sam" },
      undefined,
    ]);
  });

  test("a message saved with no author is the chat owner's", async () => {
    const [sam, solo] = await Promise.all([testUser(), testUser()]);
    await saveUserName(sam.id, "Sam");
    const data = testData(sam);
    const projectChat = await data.chat(await data.quest());
    const standaloneChat = await privateChat(solo.id);
    const hello: Exchange = { message: "Hello", reply: REPLY };
    await Promise.all([
      data.exchanges(projectChat, [hello]),
      testData(solo).exchanges(standaloneChat, [hello]),
    ]);
    await Promise.all([
      forgetAuthors(projectChat),
      forgetAuthors(standaloneChat),
    ]);

    const [inQuest, standalone] = await Promise.all([
      authorsIn(sam, projectChat),
      authorsIn(solo, standaloneChat),
    ]);
    expect(inQuest).toStrictEqual([{ id: sam.id, name: "Sam" }, undefined]);
    // The standalone chat's opening is the construct's.
    expect(standalone.filter((author) => author !== undefined)).toStrictEqual([
      { id: solo.id, name: undefined, email: solo.email },
    ]);
  });

  test("with several authors, each user turn names its author", async () => {
    const { sam, alex, chat } = await samAndAlex();
    await testData(sam).exchanges(chat, [
      { message: "The flipper loops are fixed.", reply: REPLY, author: alex },
    ]);
    await signIn(sam);

    // The mock construct recalls the lines the model got, from the prompt and
    // the turns, that hold the word: each turn's header, Alex's by a label
    // since Alex has no name, and never an email address.
    const recalled = messageText(
      await constructReply(chat.id, "/mock-recall Message from"),
    );
    expect(recalled).toContain("- [Message from person 1]");
    expect(recalled).toContain('- [Message from "Sam"]');
    expect(recalled).not.toContain(alex.email);
    expect(await constructPrompt(chat.id)).toContain(SEVERAL_AUTHORS_RULES);
    // What was saved is what Sam wrote, without a header.
    const saved = await listMessages(sam.id, chat.id);
    expect(messageText(saved.at(-2))).toBe("/mock-system-prompt");
  });

  test("the owner sees another author's messages under their name, without a named author's address", async () => {
    const { sam, alex, chat } = await samAndAlex();
    await saveUserName(alex.id, "Alex");
    await testData(sam).exchanges(chat, [
      { message: "The flipper loops are fixed.", reply: REPLY, author: alex },
    ]);
    await sendToEnd(sam, chat, "Nice. Can we look at the shell next?");

    const ownersView = await listMessages(sam.id, chat.id);
    const [alexsMessage] = ownersView;
    expect(
      otherAuthorNames(ownersView, sam.id).get(alexsMessage?.id ?? ""),
    ).toBe("Alex");
    const payload = JSON.stringify(ownersView);
    expect(payload).not.toContain(sam.email);
    expect(payload).not.toContain(alex.email);
  });

  test("a chat only its owner writes in sends what it sent before", async () => {
    const { sam, chat } = await samAndAlex();
    await testData(sam).exchanges(chat, [
      { message: "The flipper loops are fixed.", reply: REPLY },
    ]);
    await signIn(sam);

    const reply = await constructReply(chat.id, "Can we look at the shell?");
    expect(messageText(reply)).toBe(mockReplyText("Can we look at the shell?"));
    expect(await constructPrompt(chat.id)).not.toContain(SEVERAL_AUTHORS_RULES);
  });
});
