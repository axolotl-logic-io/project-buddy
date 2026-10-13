// "use_case_leave_during_reply" in use-cases/: a message is answered, and
// charged, once. Saving one message twice at once
// inserts it exactly once, on the test database's own Postgres, which is
// what lets two simultaneous first sends refuse the one that didn't save it
// (conversation-to-answer.test.ts proves that refusal). Through /api/chat, a
// message sent again after its reply is saved gets 409 already-answered, no
// second reply and no second charge.
import { type Browser, expect, type Page } from "@playwright/test";
import type { User } from "@/accounts/users-store.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import { getChat, listMessages, saveMessage } from "@/chats/store.ts";
import { readAppErrorCase } from "@/errors/app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { type MessageId, parseMessageId } from "@/ids.ts";
import { readMonthlyUsage } from "@/quota/spend-store.ts";
import { type TestData, test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";

const QUESTION = "How do I bevel an edge?";

function newMessageId(): MessageId {
  const id = parseMessageId(crypto.randomUUID());
  if (id === undefined) {
    throw new Error("A random UUID is not a message id");
  }
  return id;
}

function question(id: MessageId): {
  id: MessageId;
  role: "user";
  parts: { type: "text"; text: string }[];
} {
  return { id, role: "user", parts: [{ type: "text", text: QUESTION }] };
}

// Sends the message to the chat as the page's signed-in user, as the chat
// view does, and reads the whole answer.
async function send(
  page: Page,
  chat: Chat,
  id: MessageId,
): Promise<{ status: number; body: string }> {
  const response = await page.request.post("/api/chat", {
    data: { id: chat.id, message: question(id) },
  });
  return { status: response.status(), body: await response.text() };
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
): Promise<number> {
  const chat = await otherTestData.chat(await otherTestData.project());
  const context = await browser.newContext();
  const page = await context.newPage();
  await logIn(page, otherAccount);
  expect((await send(page, chat, newMessageId())).status).toBe(HTTP_STATUS.ok);
  await expectAnsweredAndNamed(otherAccount, chat);
  await context.close();
  return spentThisMonth(otherAccount);
}

test.describe("use_case_leave_during_reply", () => {
  test("saving one message twice at once inserts it exactly once", async ({
    account,
    testData,
  }) => {
    const project = await testData.project();
    const chat = await testData.chat(project);
    const otherChat = await testData.chat(project);
    const message = question(newMessageId());

    const both = await Promise.all([
      saveMessage(account.id, chat.id, message),
      saveMessage(account.id, chat.id, message),
    ]);

    expect(both.toSorted()).toEqual(["already-saved", "inserted"]);
    expect(await saveMessage(account.id, chat.id, message)).toBe(
      "already-saved",
    );
    expect(await saveMessage(account.id, otherChat.id, message)).toBe(
      "id-taken",
    );
    const fresh = question(newMessageId());
    expect(await saveMessage(account.id, chat.id, fresh)).toBe("inserted");
    expect(
      (await listMessages(account.id, chat.id)).map(({ id }) => id),
    ).toEqual([message.id, fresh.id]);
  });

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
});
