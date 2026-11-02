// "use_case_chat_with_several_people" in use-cases/chats.md, against the
// test database: a chat records who wrote each user message, reads a message
// saved with no author as the chat owner's, and, once more than one person
// has written in it, sends each user turn to the buddy with its author's
// name. A chat only its owner writes in sends exactly what it sent before.
// No one but a chat's owner can write in it until team projects add
// members, so another person's messages are written through the test kit.
// How the names are put on the turns is checked in author-names.test.ts,
// and the chat screen in message-authors.browser.test.tsx.
import { and, eq } from "drizzle-orm";
import { describe, expect, test } from "vitest";
import { saveUserName, type User } from "@/accounts/users-store.ts";
import type { ProjectChat } from "@/chats/chat-rows.ts";
import type { MessageAuthor } from "@/chats/message-author.ts";
import { createStandaloneChat } from "@/chats/standalone-chat.ts";
import { listMessages } from "@/chats/store.ts";
import { getDb } from "@/db/client.ts";
import { messages } from "@/db/tables/projects-and-chats.ts";
import type { ChatId } from "@/ids.ts";
import { SEVERAL_AUTHORS_RULES } from "@/replies/global-prompt.ts";
import {
  type Exchange,
  testData,
} from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { mockReplyText } from "../replies/mock-markdown-test-kit.ts";
import {
  buddyPrompt,
  buddyReply,
  messageText,
  sendToEnd,
} from "../test-database/chat-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

const REPLY: Exchange["reply"] = [{ type: "text", text: "Great work." }];

// The author of each message in the owner's chat, oldest first: undefined
// for the buddy's.
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

// The owner, named Sam, with a chat in a new project, and Alex, another
// user with no name.
async function samAndAlex(): Promise<{
  sam: User;
  alex: User;
  chat: ProjectChat;
}> {
  const [sam, alex] = await Promise.all([testUser(), testUser()]);
  await saveUserName(sam.id, "Sam");
  const data = testData(sam);
  const chat = await data.chat(await data.project());
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
      { id: alex.id, name: alex.email },
      undefined,
      { id: sam.id, name: "Sam" },
      undefined,
    ]);
  });

  test("a message saved with no author is the chat owner's", async () => {
    const [sam, solo] = await Promise.all([testUser(), testUser()]);
    await saveUserName(sam.id, "Sam");
    const data = testData(sam);
    const projectChat = await data.chat(await data.project());
    const standaloneChat = await createStandaloneChat(solo.id);
    const hello: Exchange = { message: "Hello", reply: REPLY };
    await Promise.all([
      data.exchanges(projectChat, [hello]),
      testData(solo).exchanges(standaloneChat, [hello]),
    ]);
    await Promise.all([
      forgetAuthors(projectChat),
      forgetAuthors(standaloneChat),
    ]);

    const [inProject, standalone] = await Promise.all([
      authorsIn(sam, projectChat),
      authorsIn(solo, standaloneChat),
    ]);
    expect(inProject).toStrictEqual([{ id: sam.id, name: "Sam" }, undefined]);
    // The standalone chat's opening is the buddy's.
    expect(standalone.filter((author) => author !== undefined)).toStrictEqual([
      { id: solo.id, name: solo.email },
    ]);
  });

  test("with several authors, each user turn names its author", async () => {
    const { sam, alex, chat } = await samAndAlex();
    await testData(sam).exchanges(chat, [
      { message: "The flipper loops are fixed.", reply: REPLY, author: alex },
    ]);
    await signIn(sam);

    // The mock buddy quotes the user turn it answers, as the model got it.
    const reply = await buddyReply(chat.id, "Can we look at the shell?");
    expect(messageText(reply)).toBe(
      mockReplyText("Sam: Can we look at the shell?"),
    );
    // What was saved is what Sam wrote, without the name.
    const saved = await listMessages(sam.id, chat.id);
    expect(messageText(saved.at(-2))).toBe("Can we look at the shell?");
  });

  test("a chat only its owner writes in sends what it sent before", async () => {
    const { sam, chat } = await samAndAlex();
    await testData(sam).exchanges(chat, [
      { message: "The flipper loops are fixed.", reply: REPLY },
    ]);
    await signIn(sam);

    const reply = await buddyReply(chat.id, "Can we look at the shell?");
    expect(messageText(reply)).toBe(mockReplyText("Can we look at the shell?"));
    expect(await buddyPrompt(chat.id)).not.toContain(SEVERAL_AUTHORS_RULES);
  });
});
