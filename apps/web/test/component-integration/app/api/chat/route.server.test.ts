// Chatting through POST /api/chat, in the test database with the mock
// construct: what is saved, and in what order. What she sees of it is the chat
// view's tests' (src/components/chat-view*.test.tsx).

import { describe, expect, test, vi } from "vitest";
import { getChat, listMessages } from "@/chats/store.ts";
import { getConstruct, snapshotOf } from "@/constructs/index.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { setSpell } from "@/spells/spell-store.ts";
import { afterTasksDone } from "../../../test-database/after-test-kit.ts";
import {
  exchange,
  postMessage,
  question,
  savedConversation,
  sendToEnd,
  userWithChat,
} from "../../../test-database/chat-test-kit.ts";

test("use_case_send_message", async () => {
  const { user, chat } = await userWithChat();
  const message = question("Hello, construct!");

  const response = await postMessage(user, chat, message);
  expect(response.status).toBe(HTTP_STATUS.ok);
  await response.text();

  expect(await savedConversation(user, chat)).toEqual(
    exchange("Hello, construct!"),
  );
  const [saved] = await listMessages(user.id, chat.id);
  expect(saved?.id).toBe(message.id);
});

test("a conversation keeps every exchange, in order", async () => {
  const { user, chat } = await userWithChat("lumen");
  const first = "How do I bevel an edge?";
  const second = "Can I make it rounder?";

  await sendToEnd(user, chat, first);
  await sendToEnd(user, chat, second);
  await afterTasksDone();

  expect(await savedConversation(user, chat)).toEqual([
    ...exchange(first),
    ...exchange(second),
  ]);
});

test("use_case_continue_chat", async () => {
  const { user, chat } = await userWithChat();
  await sendToEnd(user, chat, "An earlier question");
  const reopened = await getChat(user.id, chat.id);
  expect(reopened?.id).toBe(chat.id);
  await sendToEnd(user, chat, "A later question");
  expect(await savedConversation(user, chat)).toEqual([
    ...exchange("An earlier question"),
    ...exchange("A later question"),
  ]);
});

test("use_case_construct_voice_consistent", async () => {
  const { user, chat } = await userWithChat("lumen");
  await sendToEnd(user, chat, "look");
  const reopened = await getChat(user.id, chat.id);
  expect(reopened?.construct).toEqual(snapshotOf(getConstruct("lumen")));
  await sendToEnd(user, chat, "look");
  const replies = (await savedConversation(user, chat)).filter(
    ({ role }) => role === "assistant",
  );
  expect(replies).toHaveLength(2);
  expect(replies[0]?.text).toBe(replies[1]?.text);
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
    await sendToEnd(user, chat, second);
    expect(await savedConversation(user, chat)).toEqual([
      ...exchange(first),
      ...exchange(second),
    ]);
  });
});

vi.mock("@/spells/spell-store.ts", { spy: true });

test("use_case_send_while_construct_replies", async () => {
  const { user, chat } = await userWithChat();
  const started = Promise.withResolvers<void>();
  const release = Promise.withResolvers<Awaited<ReturnType<typeof setSpell>>>();
  vi.mocked(setSpell).mockImplementationOnce(() => {
    started.resolve();
    return release.promise;
  });
  // Spell execution precedes the response, so keep the first request in flight.
  const response = postMessage(user, chat, question("cast brainstorm"));
  try {
    await started.promise;
    await sendToEnd(user, chat, "Another thought");
    expect(
      (await savedConversation(user, chat)).map(({ text }) => text),
    ).toContain("Another thought");
  } finally {
    release.resolve(true);
    await (await response).text();
    await afterTasksDone();
    vi.restoreAllMocks();
  }
  const saved = await savedConversation(user, chat);
  expect(
    saved.filter(({ role }) => role === "assistant").map(({ text }) => text),
  ).toContain(
    "Cast Brainstorm. Subsequent messages go into Ideas. Use stop when you’re finished.",
  );
  expect(
    saved.filter(({ role }) => role === "user").map(({ text }) => text),
  ).toEqual(["cast brainstorm", "Another thought"]);
});
