// A reply that fails, or that holds a failed step, through POST /api/chat
// with the mock tutor (use-cases/when-things-go-wrong.md and chats.md): what
// the route streams and what the chat saves, which is all a reload shows.
// How the alerts, the working note and the failure line look is
// chat-error.test.tsx's, working-note.browser.test.tsx's and
// chat-view-tool-failure.test.tsx's.
import type { UIMessage } from "ai";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import type { User } from "@/accounts/users-store.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import { listMessages } from "@/chats/store.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { readMemoryHistory } from "@/memory/memory-store.ts";
import {
  mockWorkingNoteAnswer,
  mockWorkingNoteText,
} from "@/tutor/mock-working-note.ts";
import {
  type SentMessage,
  sendChatMessage,
} from "../../../test-database/chat-test-kit.ts";
import { testData } from "../../../test-database/data-test-kit.ts";
import { lapsed, signIn } from "../../../test-database/session-test-kit.ts";
import { testUser } from "../../../test-database/user-test-kit.ts";

const ERROR_CHUNK = z.object({
  type: z.literal("error"),
  errorText: z.string(),
});
const OVERLOADED = "/mock-error overloaded_error";
const NOTE_TOPIC = "zibble";

// A test user's new chat, with the user signed in.
async function signedInChat(): Promise<{ user: User; chat: Chat }> {
  const user = await testUser();
  await signIn(user);
  const data = testData(user);
  const chat = await data.chat(await data.project());
  return { user, chat };
}

// The error cases a reply's stream sent.
function streamedErrors({ chunks }: SentMessage): string[] {
  return chunks.flatMap((chunk) => {
    const error = ERROR_CHUNK.safeParse(chunk);
    if (error.success) {
      return [error.data.errorText];
    }
    return [];
  });
}

// A saved message's parts in order: each text, and each tool part's type.
function partsInOrder(message: UIMessage | undefined): string[] {
  return (message?.parts ?? []).flatMap((part) => {
    if (part.type === "text") {
      return [part.text];
    }
    if (part.type.startsWith("tool-")) {
      return [part.type];
    }
    return [];
  });
}

// The chat's saved messages, each as its role and its parts in order.
async function savedConversation(user: User, chat: Chat): Promise<string[][]> {
  const saved = await listMessages(user.id, chat.id);
  return saved.map((message) => [message.role, ...partsInOrder(message)]);
}

test("use_case_reply_fails", async () => {
  const { user, chat } = await signedInChat();

  const overloaded = await sendChatMessage(chat.id, OVERLOADED);

  expect(streamedErrors(overloaded)).toEqual(["overloaded"]);
  expect(await savedConversation(user, chat)).toEqual([["user", OVERLOADED]]);

  const billing = await sendChatMessage(chat.id, "/mock-error billing_error");

  expect(streamedErrors(billing)).toEqual(["out-of-credits"]);
});

test("use_case_session_expired_in_chat", async () => {
  const user = await testUser();
  const data = testData(user);
  const chat = await data.chat(await data.project());
  await lapsed(user);

  const response = await sendChatMessage(chat.id, "Still there?");

  expect(response.status).toBe(HTTP_STATUS.unauthorized);
  expect(response.body).toBe("signed-out");
  expect(await listMessages(user.id, chat.id)).toEqual([]);
});

test("use_case_see_working_note", async () => {
  const { user, chat } = await signedInChat();
  const message = `/mock-working-note ${NOTE_TOPIC}`;

  await sendChatMessage(chat.id, message);

  expect(await savedConversation(user, chat)).toEqual([
    ["user", message],
    [
      "assistant",
      mockWorkingNoteText(NOTE_TOPIC),
      "tool-search_manual",
      mockWorkingNoteAnswer(NOTE_TOPIC),
    ],
  ]);
});

describe("use_case_tutor_updates_memory", () => {
  test("a malformed memory edit saves its failed call and leaves the memory unchanged", async () => {
    const { user, chat } = await signedInChat();

    await sendChatMessage(
      chat.id,
      `/mock-tool update_memory ${JSON.stringify({ oldText: 1 })}`,
    );

    const reply = (await listMessages(user.id, chat.id)).at(-1);
    const memoryCalls = (reply?.parts ?? []).filter(
      ({ type }) => type === "tool-update_memory",
    );
    expect(reply?.role).toBe("assistant");
    expect(memoryCalls).toEqual([
      expect.objectContaining({ state: "output-error" }),
    ]);
    expect(await readMemoryHistory(user.id, chat.projectId)).toEqual([]);
  });
});
