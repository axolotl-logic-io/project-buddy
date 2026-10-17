// "use_case_leave_during_reply" in use-cases/: a message is answered, and
// charged, once. Through /api/chat, a message sent again after its reply is
// saved gets 409 already-answered, no second reply and no second charge,
// and so does one sent again while its reply still streams: the first
// request's claim on the message (claimReply) holds until its reply ends.
// What the store promises is src/chats/store-resend.server.test.ts's.
import { describe, expect, test, vi } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import {
  postMessage,
  question,
  sendToEnd,
  spentThisMonth,
  userWithChat,
} from "@/chats/chat-server-test-kit.ts";
import { settleAfterTasks } from "@/chats/next-server-test-kit.ts";
import { listMessages } from "@/chats/store.ts";
import { readAppErrorCase } from "@/errors/app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { MOCK_SLOW_DELAY_MS } from "@/tutor/mock-slow.ts";

vi.mock("next/server", async (importOriginal) => {
  const { after, connection } = await import("@/chats/next-server-test-kit.ts");
  return {
    ...(await importOriginal<typeof import("next/server")>()),
    after,
    connection,
  };
});

const QUESTION = "How do I bevel an edge?";
// A question the mock tutor answers only after MOCK_SLOW_DELAY_MS, so its
// reply still streams while the test sends it again.
const SLOW_QUESTION = `/mock-slow ${QUESTION}`;
// The rest of the test besides the slow replies' waits: the requests and
// reading what they saved. The worst measured was 0.5 s (a 1-minute load
// average of 13 on 10 cores, with other pipelines' suites running); this is
// 20 times that, for heavier load.
const SLOW_TEST_MARGIN_MS = 10_000;
// Her slow reply, then the other user's, one after the other.
const SLOW_REPLIES_AWAITED = 2;
const SEND_AGAIN_WHILE_REPLYING_TIMEOUT_MS: number =
  SLOW_REPLIES_AWAITED * MOCK_SLOW_DELAY_MS + SLOW_TEST_MARGIN_MS;

// The roles of the messages saved in user's chat, oldest first.
async function savedRoles(user: User, chat: Chat): Promise<string[]> {
  return (await listMessages(user.id, chat.id)).map(({ role }) => role);
}

// What one first send of text costs, once its reply is saved and the chat
// named: another user sends it once, in a chat of their own.
async function costOfOneSend(text: string): Promise<number> {
  const { user, chat } = await userWithChat();
  await sendToEnd(user, chat, text);
  await settleAfterTasks();
  return spentThisMonth(user);
}

describe("use_case_leave_during_reply", () => {
  test("a message sent again after its reply is saved gets 409, no second reply and no second charge", async () => {
    const { user, chat } = await userWithChat();
    const message = question(QUESTION);

    const first = await postMessage(user, chat, message);
    expect(first.status).toBe(HTTP_STATUS.ok);
    await first.text();
    await settleAfterTasks();
    const again = await postMessage(user, chat, message);

    expect(again.status).toBe(HTTP_STATUS.conflict);
    expect(readAppErrorCase(await again.text())).toBe("already-answered");
    await settleAfterTasks();
    expect(await savedRoles(user, chat)).toEqual(["user", "assistant"]);
    expect(await spentThisMonth(user)).toBe(await costOfOneSend(QUESTION));
  });

  test(
    "a message sent again while its reply streams gets 409, no second reply and no second charge",
    async () => {
      const { user, chat } = await userWithChat();
      const message = question(SLOW_QUESTION);

      // The first request has claimed the message once it resolves, however
      // fast its reply.
      const first = await postMessage(user, chat, message);
      const again = await postMessage(user, chat, message);

      expect(again.status).toBe(HTTP_STATUS.conflict);
      expect(readAppErrorCase(await again.text())).toBe("already-answered");
      // The first reply streamed to its end.
      expect(await first.text()).toContain('"type":"finish"');
      await settleAfterTasks();
      expect(await savedRoles(user, chat)).toEqual(["user", "assistant"]);
      expect(await spentThisMonth(user)).toBe(
        await costOfOneSend(SLOW_QUESTION),
      );
    },
    SEND_AGAIN_WHILE_REPLYING_TIMEOUT_MS,
  );
});
