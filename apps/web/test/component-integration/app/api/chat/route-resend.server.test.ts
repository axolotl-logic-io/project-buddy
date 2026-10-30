// "use_case_leave_during_reply" in use-cases/: a message is answered, and
// charged, once. Through /api/chat, a message sent again after its reply is
// saved gets 409 already-answered, no second reply and no second charge,
// and so does one sent again while its reply still streams: the first
// request's claim on the message (claimReply) holds until its reply ends.
// What the store promises is test/component-integration/chats/store-resend.server.test.ts's.
import { describe, expect, test } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import { listMessages } from "@/chats/store.ts";
import { readAppErrorCase } from "@/errors/app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { MOCK_SLOW_DELAY_MS } from "@/replies/mock-slow.ts";
import { spentThisMonth } from "../../../../support/test-database/spend-test-kit.ts";
import { afterTasksDone } from "../../../test-database/after-test-kit.ts";
import {
  postMessage,
  question,
  userWithChat,
} from "../../../test-database/chat-test-kit.ts";

const QUESTION = "How do I bevel an edge?";
// A question the mock buddy answers only after MOCK_SLOW_DELAY_MS, so its
// reply still streams while the test sends it again.
const SLOW_QUESTION = `/mock-slow ${QUESTION}`;
// The rest of the test besides the slow replies' waits: the requests and
// reading what they saved. The worst measured was 0.5 s (a 1-minute load
// average of 13 on 10 cores, with other pipelines' suites running); this is
// 20 times that, for heavier load.
const SLOW_TEST_MARGIN_MS = 10_000;
// Both slow responses progress together after sequential authentication.
const SLOW_REPLIES_AWAITED = 1;
const SEND_AGAIN_WHILE_REPLYING_TIMEOUT_MS: number =
  SLOW_REPLIES_AWAITED * MOCK_SLOW_DELAY_MS + SLOW_TEST_MARGIN_MS;

// The roles of the messages saved in user's chat, oldest first.
async function savedRoles(user: User, chat: Chat): Promise<string[]> {
  return (await listMessages(user.id, chat.id)).map(({ role }) => role);
}
async function comparisonSend(
  text: string,
): Promise<{ user: User; finished: Promise<string> }> {
  const { user, chat } = await userWithChat();
  const response = await postMessage(user, chat, question(text));
  if (response.status !== HTTP_STATUS.ok) {
    throw new Error(`Comparison send returned ${response.status}`);
  }
  return { user, finished: response.text() };
}

describe("use_case_leave_during_reply", () => {
  test("a message sent again after its reply is saved gets 409, no second reply and no second charge", async () => {
    const { user, chat } = await userWithChat();
    const message = question(QUESTION);

    const comparison = await comparisonSend(QUESTION);
    const first = await postMessage(user, chat, message);
    expect(first.status).toBe(HTTP_STATUS.ok);
    await Promise.all([first.text(), comparison.finished]);
    await afterTasksDone();
    const again = await postMessage(user, chat, message);

    expect(again.status).toBe(HTTP_STATUS.conflict);
    expect(readAppErrorCase(await again.text())).toBe("already-answered");
    await afterTasksDone();
    expect(await savedRoles(user, chat)).toEqual(["user", "assistant"]);
    expect(await spentThisMonth(user)).toBe(
      await spentThisMonth(comparison.user),
    );
  });

  test(
    "a message sent again while its reply streams gets 409, no second reply and no second charge",
    async () => {
      const { user, chat } = await userWithChat();
      // Start the comparison request before switching the shared test cookie
      // back to her account. Only the independent response bodies overlap.
      const comparison = await comparisonSend(SLOW_QUESTION);
      const message = question(SLOW_QUESTION);

      // The first request has claimed the message once it resolves, however
      // fast its reply.
      const first = await postMessage(user, chat, message);
      const again = await postMessage(user, chat, message);

      expect(again.status).toBe(HTTP_STATUS.conflict);
      expect(readAppErrorCase(await again.text())).toBe("already-answered");
      // The first reply streamed to its end.
      const [body] = await Promise.all([first.text(), comparison.finished]);
      expect(body).toContain('"type":"finish"');
      await afterTasksDone();
      expect(await savedRoles(user, chat)).toEqual(["user", "assistant"]);
      expect(await spentThisMonth(user)).toBe(
        await spentThisMonth(comparison.user),
      );
    },
    SEND_AGAIN_WHILE_REPLYING_TIMEOUT_MS,
  );
});
