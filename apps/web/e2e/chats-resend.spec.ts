// "use_case_leave_during_reply" in use-cases/: a message is answered, and
// charged, once. Saving one message twice at once
// inserts it exactly once, on the test database's own Postgres, which is
// what lets two simultaneous first sends refuse the one that didn't save it
// (conversation-to-answer.test.ts proves that refusal). Through /api/chat, a
// message sent again after its reply is saved gets 409 already-answered, no
// second reply and no second charge, and so does one sent again while its
// reply still streams: the first request's claim on the message
// (claimReply) holds until its reply ends.
import { type Browser, expect, type Page } from "@playwright/test";
import { eq, sql } from "drizzle-orm";
import type { User } from "@/accounts/users-store.ts";
import { type Chat, REPLY_CLAIM_SECONDS } from "@/chats/chat-rows.ts";
import {
  claimReply,
  getChat,
  listMessages,
  releaseReply,
  saveMessage,
} from "@/chats/store.ts";
import { getDb } from "@/db/client.ts";
import { messages } from "@/db/tables/projects-and-chats.ts";
import { readAppErrorCase } from "@/errors/app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { type MessageId, parseMessageId } from "@/ids.ts";
import { readMonthlyUsage } from "@/quota/spend-store.ts";
import { type TestData, test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";

const QUESTION = "How do I bevel an edge?";
// A question the mock tutor answers only after MOCK_SLOW_DELAY_MS, so its
// reply still streams while the test sends it again.
const SLOW_QUESTION = `/mock-slow ${QUESTION}`;

function newMessageId(): MessageId {
  const id = parseMessageId(crypto.randomUUID());
  if (id === undefined) {
    throw new Error("A random UUID is not a message id");
  }
  return id;
}

function question(
  id: MessageId,
  text = QUESTION,
): {
  id: MessageId;
  role: "user";
  parts: { type: "text"; text: string }[];
} {
  return { id, role: "user", parts: [{ type: "text", text }] };
}

// Sends the message to the chat as the page's signed-in user, as the chat
// view does, and reads the whole answer.
async function send(
  page: Page,
  chat: Chat,
  id: MessageId,
  text = QUESTION,
): Promise<{ status: number; body: string }> {
  const response = await page.request.post("/api/chat", {
    data: { id: chat.id, message: question(id, text) },
  });
  return { status: response.status(), body: await response.text() };
}

// Sends the message twice from the page, as the chat view does: the second
// time as soon as the first response's headers arrive, while its reply
// still streams, then reads both. The server claims the message's reply
// before it answers, so the first request's claim holds by then, however
// fast the reply is.
function sendAgainWhileStreaming(
  page: Page,
  chat: Chat,
  id: MessageId,
  text: string,
): Promise<{ first: string; againStatus: number; again: string }> {
  return page.evaluate(
    async (
      body: string,
    ): Promise<{ first: string; againStatus: number; again: string }> => {
      const request = {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      };
      const firstResponse = await fetch("/api/chat", request);
      const againResponse = await fetch("/api/chat", request);
      return {
        again: await againResponse.text(),
        againStatus: againResponse.status,
        first: await firstResponse.text(),
      };
    },
    JSON.stringify({ id: chat.id, message: question(id, text) }),
  );
}

// Claims the reply to the owner's message twice at once, and says which
// claims succeeded, failures first.
async function claimTwiceAtOnce(
  account: User,
  chat: Chat,
  id: MessageId,
): Promise<boolean[]> {
  const claims = await Promise.all([
    claimReply(account.id, chat.id, id),
    claimReply(account.id, chat.id, id),
  ]);
  return claims.toSorted();
}

// Waits until the reply to her one message is saved and the chat is named,
// the last of the work, and charges, that a first message starts.
async function expectAnsweredAndNamed(
  account: User,
  chat: Chat,
): Promise<void> {
  await expect
    .poll(async () =>
      (await listMessages(account.id, chat.id)).map(({ role }) => role),
    )
    .toEqual(["user", "assistant"]);
  await expect
    .poll(async () => (await getChat(account.id, chat.id))?.name)
    .toBeDefined();
}

async function spentThisMonth(account: User): Promise<number> {
  return (await readMonthlyUsage(account.id, new Date())).spentMicroUsd;
}

// What one first send of the question costs: the other account sends it once,
// in its own browser.
async function costOfOneSend(
  browser: Browser,
  otherAccount: User,
  otherTestData: TestData,
  text = QUESTION,
): Promise<number> {
  const chat = await otherTestData.chat(await otherTestData.project());
  const context = await browser.newContext();
  const page = await context.newPage();
  await logIn(page, otherAccount);
  expect((await send(page, chat, newMessageId(), text)).status).toBe(
    HTTP_STATUS.ok,
  );
  await expectAnsweredAndNamed(otherAccount, chat);
  await context.close();
  return spentThisMonth(otherAccount);
}

// What a test of this case uses: her account, page and data, and the other
// user's account and data.
interface CaseArgs {
  readonly account: User;
  readonly browser: Browser;
  readonly otherAccount: User;
  readonly otherTestData: TestData;
  readonly page: Page;
  readonly testData: TestData;
}

// Of two claims at once on a message's reply, exactly one succeeds, and only
// once the last claim is released or has lapsed.
async function claimEachReplyOnce({
  account,
  testData,
}: CaseArgs): Promise<void> {
  const chat = await testData.chat(await testData.project());
  const message = question(newMessageId());
  const { id } = message;

  expect(await saveMessage(account.id, chat.id, message)).toBe("inserted");
  expect(await claimTwiceAtOnce(account, chat, id)).toEqual([false, false]);

  await releaseReply(account.id, chat.id, id);
  expect(await claimTwiceAtOnce(account, chat, id)).toEqual([false, true]);

  await getDb()
    .update(messages)
    .set({
      replyStartedAt: sql`now() - make_interval(secs => ${REPLY_CLAIM_SECONDS + 1})`,
    })
    .where(eq(messages.id, id));
  expect(await claimTwiceAtOnce(account, chat, id)).toEqual([false, true]);
}

// A message sent again while its reply streams gets 409, no second reply and
// no second charge.
async function sendAgainWhileReplying({
  account,
  browser,
  otherAccount,
  otherTestData,
  page,
  testData,
}: CaseArgs): Promise<void> {
  const chat = await testData.chat(await testData.project());
  await logIn(page, account);

  const sent = await sendAgainWhileStreaming(
    page,
    chat,
    newMessageId(),
    SLOW_QUESTION,
  );

  expect(sent.againStatus).toBe(HTTP_STATUS.conflict);
  expect(readAppErrorCase(sent.again)).toBe("already-answered");
  // The first reply streamed to its end.
  expect(sent.first).toContain('"type":"finish"');
  await expectAnsweredAndNamed(account, chat);
  expect(await spentThisMonth(account)).toBe(
    await costOfOneSend(browser, otherAccount, otherTestData, SLOW_QUESTION),
  );
}

// Saving one message twice at once inserts it exactly once.
async function saveTwiceAtOnce({ account, testData }: CaseArgs): Promise<void> {
  const project = await testData.project();
  const chat = await testData.chat(project);
  const otherChat = await testData.chat(project);
  const message = question(newMessageId());

  const both = await Promise.all([
    saveMessage(account.id, chat.id, message),
    saveMessage(account.id, chat.id, message),
  ]);

  expect(both.toSorted()).toEqual(["already-saved", "inserted"]);
  expect(await saveMessage(account.id, chat.id, message)).toBe("already-saved");
  expect(await saveMessage(account.id, otherChat.id, message)).toBe("id-taken");
  const fresh = question(newMessageId());
  expect(await saveMessage(account.id, chat.id, fresh)).toBe("inserted");
  expect((await listMessages(account.id, chat.id)).map(({ id }) => id)).toEqual(
    [message.id, fresh.id],
  );
}

test.describe("use_case_leave_during_reply", () => {
  test(
    "saving one message twice at once inserts it exactly once",
    saveTwiceAtOnce,
  );

  test("a message sent again after its reply is saved gets 409, no second reply and no second charge", async ({
    account,
    browser,
    otherAccount,
    otherTestData,
    page,
    testData,
  }) => {
    const chat = await testData.chat(await testData.project());
    const id = newMessageId();
    await logIn(page, account);

    expect((await send(page, chat, id)).status).toBe(HTTP_STATUS.ok);
    await expectAnsweredAndNamed(account, chat);
    const again = await send(page, chat, id);

    expect(again.status).toBe(HTTP_STATUS.conflict);
    expect(readAppErrorCase(again.body)).toBe("already-answered");
    expect(
      (await listMessages(account.id, chat.id)).map(({ role }) => role),
    ).toEqual(["user", "assistant"]);
    expect(await spentThisMonth(account)).toBe(
      await costOfOneSend(browser, otherAccount, otherTestData),
    );
  });

  test(
    "of two claims at once on a message's reply, exactly one succeeds, and only once the last is released or has lapsed",
    claimEachReplyOnce,
  );

  test(
    "a message sent again while its reply streams gets 409, no second reply and no second charge",
    sendAgainWhileReplying,
  );
});
