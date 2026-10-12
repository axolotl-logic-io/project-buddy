import { expect, type Locator, type Page } from "@playwright/test";
import { mockChatName } from "@/tutor/mock-chat-name.ts";
import { CHAT_COPY, CHAT_NAME_COPY } from "@/ui/copy/chat.ts";
import {
  exchange,
  expectMessages,
  personaName,
  sendMessage,
} from "./chat-page.ts";
import { test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";

// The messages a chat has after her first message and its reply, and after
// her third.
const AFTER_FIRST_EXCHANGE = 2;
const AFTER_THIRD_EXCHANGE = 6;
// How long one load may take to show a name before the page is reloaded.
const NAME_WAIT_MS = 1000;

// The chat page's heading for a chat named `name` with the persona `tutor`.
function chatHeading(page: Page, name: string, tutor: string): Locator {
  return page.getByRole("heading", {
    exact: true,
    level: 1,
    name: `${name} ${CHAT_COPY.heading(tutor)}`,
  });
}

// Reloads the page until `named` shows: the chat is named after the reply is
// saved, so the first load may come too early.
async function reloadUntilVisible(page: Page, named: Locator): Promise<void> {
  await expect(async () => {
    await page.reload();
    await expect(named).toBeVisible({ timeout: NAME_WAIT_MS });
  }).toPass();
}

// Checks that the project's chats link to the chat by `title`.
async function expectListedAs(
  page: Page,
  chat: { id: string; projectId: string },
  title: string,
): Promise<void> {
  await page.goto(`/projects/${chat.projectId}`);
  await expect(
    page.getByRole("link", { exact: true, name: title }),
  ).toHaveAttribute("href", `/chats/${chat.id}`);
}

test("use_case_chat_named_automatically", async ({ page, testData }) => {
  const project = await testData.project();
  const chat = await testData.chat(project, "mr-tee");
  const tutor = personaName(chat.personaId);
  const first = "Bevel a donut";
  const second = "Make it rounder";
  const third = "Now add sprinkles";
  const firstName = mockChatName(first, AFTER_FIRST_EXCHANGE);
  await logIn(page);
  await page.goto(`/chats/${chat.id}`);

  await test.step("before her first message, the chat is a new chat", async () => {
    await expect(
      chatHeading(page, CHAT_NAME_COPY.fallback, tutor),
    ).toBeVisible();
  });

  await test.step("her first message names the chat", async () => {
    await sendMessage(page, first);
    await expectMessages(page, exchange(tutor, first));

    await reloadUntilVisible(page, chatHeading(page, firstName, tutor));
  });

  await test.step("the project lists the chat by its name and persona", async () => {
    await expectListedAs(
      page,
      chat,
      CHAT_NAME_COPY.listTitle(firstName, tutor),
    );
  });

  await test.step("her second message keeps the name, and her third renames it", async () => {
    await page.goto(`/chats/${chat.id}`);
    await sendMessage(page, second);
    await expectMessages(page, [
      ...exchange(tutor, first),
      ...exchange(tutor, second),
    ]);
    await page.reload();
    await expect(chatHeading(page, firstName, tutor)).toBeVisible();

    await sendMessage(page, third);
    await expectMessages(page, [
      ...exchange(tutor, first),
      ...exchange(tutor, second),
      ...exchange(tutor, third),
    ]);
    await reloadUntilVisible(
      page,
      chatHeading(page, mockChatName(first, AFTER_THIRD_EXCHANGE), tutor),
    );
  });
});

test("use_case_rename_chat", async ({ page, testData }) => {
  const project = await testData.project();
  const chat = await testData.chat(project, "mr-tee");
  const tutor = personaName(chat.personaId);
  const herName = "Donut bevels";
  const first = "Bevel a donut";
  const second = "Make it rounder";
  const nameField = page.getByRole("textbox", { name: CHAT_NAME_COPY.label });
  const save = page.getByRole("button", { name: CHAT_NAME_COPY.save });
  await logIn(page);
  await page.goto(`/chats/${chat.id}`);
  await page.getByText(CHAT_NAME_COPY.rename).click();

  await test.step("a name of spaces asks for a name and keeps her text", async () => {
    await nameField.fill("   ");
    await save.click();

    // The page's own alert: Next's route announcer is one too, outside main.
    await expect(page.getByRole("main").getByRole("alert")).toHaveText(
      CHAT_NAME_COPY.needsName,
    );
    await expect(nameField).toHaveValue("   ");
    await expect(
      chatHeading(page, CHAT_NAME_COPY.fallback, tutor),
    ).toBeVisible();
  });

  await test.step("her name shows at once, and after a reload", async () => {
    await nameField.fill(herName);
    await save.click();

    await expect(chatHeading(page, herName, tutor)).toBeVisible();
    await page.reload();
    await expect(chatHeading(page, herName, tutor)).toBeVisible();
  });

  await test.step("her messages don't rename the chat", async () => {
    await sendMessage(page, first);
    await expectMessages(page, exchange(tutor, first));
    await sendMessage(page, second);
    await expectMessages(page, [
      ...exchange(tutor, first),
      ...exchange(tutor, second),
    ]);

    await page.reload();
    await expect(chatHeading(page, herName, tutor)).toBeVisible();
  });

  await test.step("the project lists the chat by her name", async () => {
    await expectListedAs(page, chat, CHAT_NAME_COPY.listTitle(herName, tutor));
  });
});
