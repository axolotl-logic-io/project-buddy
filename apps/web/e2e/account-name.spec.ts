// use-cases/accounts.md: she sets the name the tutor calls her, which fills
// every {{name}} in her persona's system prompt, and clears it again.
import { expect, type Locator, type Page } from "@playwright/test";
import type { User } from "@/accounts/users-store.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import { createChat } from "@/chats/new-chat-store.ts";
import { getPersona } from "@/personas/index.ts";
import { clonePersona, updatePersona } from "@/personas/persona-store.ts";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { tutorPrompt } from "./chat-page.ts";
import { type TestData, test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";
import { fillWhenReady } from "./page-helpers.ts";

const MR_TEE = getPersona("mr-tee");

// A chat in a new project of the account's, in a clone of Mr. Tee whose
// voice is voice, made straight in the stores.
async function chatInNamedClone(
  testData: TestData,
  voice: string,
): Promise<Chat> {
  const { account } = testData;
  const clone = await clonePersona(account.id, "mr-tee");
  if (clone === undefined) {
    throw new Error("Mr. Tee could not be cloned");
  }
  const parts = { ...clone.parts, voice };
  await updatePersona(account.id, clone.id, { parts });
  const project = await testData.project();
  return createChat(account.id, {
    projectId: project.id,
    persona: { id: MR_TEE.id, name: clone.name, parts },
  });
}

function nameField(page: Page): Locator {
  return page.getByRole("textbox", { name: ACCOUNT_COPY.nameLabel });
}

// Types name into her name field on the account page, and saves it.
async function saveName(page: Page, name: string): Promise<void> {
  await fillWhenReady(nameField(page), name);
  await page.getByRole("button", { name: ACCOUNT_COPY.saveName }).click();
}

// The tutor's system prompt in the chat, as the account sees it.
async function promptIn(
  page: Page,
  account: User,
  chat: Chat,
): Promise<Locator> {
  await logIn(page, account);
  await page.goto(`/chats/${chat.id}`);
  return tutorPrompt(page);
}

test("use_case_set_name", async ({
  account,
  otherAccount,
  testData,
  otherTestData,
  page,
  browser,
}) => {
  const hers = await chatInNamedClone(testData, "Hi {{name}}");
  const theirs = await chatInNamedClone(otherTestData, "Hi {{name}}");

  await test.step("she saves her name, and it shows after a reload", async () => {
    await logIn(page, account);
    await page.goto("/account");
    await expect(nameField(page)).toHaveValue("");
    await saveName(page, "  Mabel ");

    await expect(
      page.getByText(ACCOUNT_COPY.nameSaved, { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(nameField(page)).toHaveValue("Mabel");
  });

  await test.step("her prompt says her name for {{name}}", async () => {
    const prompt = await promptIn(page, account, hers);

    await expect(prompt).toContainText("Hi Mabel");
    await expect(prompt).not.toContainText("{{name}}");
  });

  await test.step("another user's prompt never holds her name", async () => {
    const context = await browser.newContext();
    const theirPage = await context.newPage();
    const prompt = await promptIn(theirPage, otherAccount, theirs);

    await expect(prompt).toContainText("Hi the user");
    await expect(prompt).not.toContainText("Mabel");
    await context.close();
  });

  await test.step("a name with braces is refused, and kept in the field", async () => {
    await page.goto("/account");
    await saveName(page, "{x}");

    await expect(page.getByText(ACCOUNT_COPY.nameBraces)).toBeVisible();
    await expect(nameField(page)).toHaveValue("{x}");
    await page.reload();
    await expect(nameField(page)).toHaveValue("Mabel");
  });

  await test.step("once she clears her name, her prompt says the user", async () => {
    await saveName(page, "");
    await expect(
      page.getByText(ACCOUNT_COPY.nameSaved, { exact: true }),
    ).toBeVisible();

    const prompt = await promptIn(page, account, hers);
    await expect(prompt).toContainText("Hi the user");
    await expect(prompt).not.toContainText("Mabel");
  });
});
