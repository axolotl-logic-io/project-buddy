// Chatting through POST /api/chat, in the test database with the mock
// buddy: what is saved, and in what order. What she sees of it is the chat
// view's tests' (src/components/chat-view*.test.tsx).
import { describe, expect, test } from "vitest";
import { type BuddyId, getBuddy, snapshotOf } from "@/buddies/index.ts";
import { getChat, listChats, listMessages } from "@/chats/store.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { mockChatName } from "@/replies/mock-chat-name.ts";
import { MOCK_SLOW_DELAY_MS } from "@/replies/mock-slow.ts";
import { afterTasksDone } from "../../../test-database/after-test-kit.ts";
import {
  exchange,
  postMessage,
  question,
  savedConversation,
  sendToEnd,
  userWithChat,
} from "../../../test-database/chat-test-kit.ts";

// The last line of the mock buddy's reply, inside its Python block.
const MOCK_REPLY_END = "bpy.ops.mesh.bevel(offset=0.1)";
// Her first message and its reply, which the mock names the chat from.
const FIRST_EXCHANGE = 2;
const SYSTEM_PROMPT = "/mock-system-prompt";
const NO_NAME = "{{name}}";
const SLOW_QUESTION = "/mock-slow Tell me about bevels.";
// The rest of a test that waits for one slow reply, besides its wait: the
// other exchanges and reading what they saved. The worst measured was 0.5 s
// (send-while, a 1-minute load average of 13 on 10 cores, with other
// pipelines' suites running); this is 20 times that, for heavier load.
const SLOW_TEST_MARGIN_MS = 10_000;
// The slow reply's wait, then the rest of the test.
const SEND_WHILE_REPLYING_TIMEOUT_MS: number =
  MOCK_SLOW_DELAY_MS + SLOW_TEST_MARGIN_MS;

// A line of the buddy's voice that its prompt holds as written: one with no
// placeholder for her name.
function voiceLine(buddyId: BuddyId): string {
  const line = getBuddy(buddyId)
    .parts.voice.split("\n")
    .find((candidate) => candidate !== "" && !candidate.includes(NO_NAME));
  if (line === undefined) {
    throw new Error(`${buddyId}'s voice has no line without a name`);
  }
  return line;
}

test("use_case_send_message", async () => {
  const { user, chat } = await userWithChat();
  const message = question("Hello, buddy!");

  const response = await postMessage(user, chat, message);
  expect(response.status).toBe(HTTP_STATUS.ok);
  await response.text();

  expect(await savedConversation(user, chat)).toEqual(
    exchange("Hello, buddy!"),
  );
  const [saved] = await listMessages(user.id, chat.id);
  expect(saved?.id).toBe(message.id);
});

test("use_case_reopen_chat", async () => {
  const { user, chat } = await userWithChat("mr-tee");
  const first = "How do I bevel an edge?";
  const second = "Can I make it rounder?";

  await sendToEnd(user, chat, first);
  await sendToEnd(user, chat, second);
  await afterTasksDone();

  expect(await savedConversation(user, chat)).toEqual([
    ...exchange(first),
    ...exchange(second),
  ]);
  const listed = await listChats(user.id, chat.project.id);
  expect(listed.map(({ id, name }) => ({ id, name }))).toEqual([
    { id: chat.id, name: mockChatName(first, FIRST_EXCHANGE) },
  ]);
});

// The recall command can answer only from the earlier conversation.
test("use_case_continue_chat", async () => {
  const { user, chat } = await userWithChat();
  const asked = "Remember my cobaltwalrus sculpture.";
  const followUp = "/mock-recall cobaltwalrus";

  await sendToEnd(user, chat, asked);
  await sendToEnd(user, chat, followUp);

  const conversation = await savedConversation(user, chat);
  expect(conversation.at(-1)?.text).toContain(asked);
});

// Each reply, before and after she reopens the chat, is written from the
// chat's buddy: the mock replies with the prompt it was given.
test("use_case_buddy_voice_consistent", async () => {
  const { user, chat } = await userWithChat("span-tines");

  await sendToEnd(user, chat, SYSTEM_PROMPT);
  const reopened = await getChat(user.id, chat.id);
  await sendToEnd(user, chat, SYSTEM_PROMPT);

  expect(reopened?.buddy).toEqual(snapshotOf(getBuddy("span-tines")));
  const replies = (await savedConversation(user, chat)).filter(
    ({ role }) => role === "assistant",
  );
  const promptReplies = [replies[0]?.text, replies[1]?.text];
  for (const prompt of promptReplies) {
    expect(prompt).toContain(voiceLine("span-tines"));
  }
});

describe("use_case_leave_during_reply", () => {
  test("a reply whose browser left after its first part is saved whole, before her next message", async () => {
    const { user, chat } = await userWithChat();
    const first = "Tell me about bevels.";
    const second = "Thanks, and then?";
    const leaving = new AbortController();

    const response = await postMessage(
      user,
      chat,
      question(first),
      leaving.signal,
    );
    const reader = response.body?.getReader();
    expect((await reader?.read())?.done).toBe(false);
    leaving.abort();
    await reader?.cancel();
    await afterTasksDone();

    const conversation = await savedConversation(user, chat);
    expect(conversation).toEqual(exchange(first));
    expect(conversation.at(-1)?.text).toContain(MOCK_REPLY_END);
    await sendToEnd(user, chat, second);
    expect(await savedConversation(user, chat)).toEqual([
      ...exchange(first),
      ...exchange(second),
    ]);
  });
});

test(
  "use_case_send_while_buddy_replies",
  async () => {
    const { user, chat } = await userWithChat();
    const slow = SLOW_QUESTION;
    const meanwhile = "And what about loop cuts?";

    const slowResponse = await postMessage(user, chat, question(slow));
    await sendToEnd(user, chat, meanwhile);

    expect(await savedConversation(user, chat)).toEqual([
      { role: "user", text: slow },
      ...exchange(meanwhile),
    ]);
    await slowResponse.text();
    await afterTasksDone();
    expect(await savedConversation(user, chat)).toEqual([
      ...exchange(slow),
      ...exchange(meanwhile),
    ]);
  },
  SEND_WHILE_REPLYING_TIMEOUT_MS,
);
