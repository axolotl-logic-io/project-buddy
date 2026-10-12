// The tutor's slow reply and her next message, sent meanwhile from a second
// tab: the race in which a reply is saved after a later message. The mock
// tutor's `/mock-slow <message>` waits MOCK_SLOW_DELAY_MS before it replies.
import { expect } from "@playwright/test";
import { CHAT_API_PATH } from "@/tutor/chat-protocol.ts";
import { MOCK_SLOW_DELAY_MS, mockSlowReply } from "@/tutor/mock-slow.ts";
import {
  chatMessages,
  exchange,
  expectMessages,
  fromUser,
  lastMessage,
  personaName,
  sendMessage,
} from "./chat-page.ts";
import { test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";

// How long after the slow reply's delay its text may take to show.
const SLOW_REPLY_MARGIN_MS = 10_000;

// The text of the mock tutor's reply to `/mock-slow <message>`.
function slowReplyTo(message: string): string {
  return mockSlowReply(message)
    .map((step) => step.text)
    .join("");
}

test("use_case_send_while_tutor_replies", async ({
  account,
  context,
  page,
  testData,
}) => {
  const chat = await testData.chat(await testData.project());
  const tutor = personaName(chat.personaId);
  const question = "Tell me about bevels.";
  const first = `/mock-slow ${question}`;
  const second = "And what about loop cuts?";
  const firstReply = `${tutor} ${slowReplyTo(question)}`;
  await logIn(page, account);
  await page.goto(`/chats/${chat.id}`);

  await test.step("she sends a message, and the tutor takes its time", async () => {
    // The server answers once it has saved her message.
    const saved = page.waitForResponse(
      (response) => new URL(response.url()).pathname === CHAT_API_PATH,
    );
    await sendMessage(page, first);
    await saved;
  });

  const secondTab = await context.newPage();
  await test.step("from a second tab she sends another, answered at once", async () => {
    await secondTab.goto(`/chats/${chat.id}`);
    await expectMessages(secondTab, [fromUser(first)]);
    await sendMessage(secondTab, second);

    await expectMessages(secondTab, [
      fromUser(first),
      ...exchange(tutor, second),
    ]);
    await expect(
      chatMessages(page).filter({ hasText: slowReplyTo(question) }),
    ).toHaveCount(0);
  });

  await test.step("the slow reply then arrives in the first tab", async () => {
    await expect(lastMessage(page)).toContainText(firstReply, {
      timeout: MOCK_SLOW_DELAY_MS + SLOW_REPLY_MARGIN_MS,
      useInnerText: true,
    });
  });

  await test.step("after a reload, each reply follows the message it answers", async () => {
    const conversation = [
      fromUser(first),
      firstReply,
      ...exchange(tutor, second),
    ];
    await expect(async () => {
      await secondTab.reload();
      await expectMessages(secondTab, conversation);
    }).toPass();
    await page.reload();

    await expectMessages(page, conversation);
  });
});
