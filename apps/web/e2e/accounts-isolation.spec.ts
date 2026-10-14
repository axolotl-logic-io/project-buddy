// Two users side by side, each signed in as their own account in their own
// browser: neither can see or change the other's projects, chats or memory.
// Another user's id reads as not found, exactly as an unknown id does, on
// pages, in the chat API and in Server Actions.
import { type Browser, expect, type Page } from "@playwright/test";
import type { User } from "@/accounts/users-store.ts";
import { getChat } from "@/chats/store.ts";
import { readAppErrorCase, userMessage } from "@/errors/app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { readMemory } from "@/memory/memory-store.ts";
import { clonePersona } from "@/personas/persona-store.ts";
import type { Project } from "@/projects/store.ts";
import { CHAT_NAME_COPY, NEW_CHAT_COPY } from "@/ui/copy/chat.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";
import { PERSONAS_COPY } from "@/ui/copy/personas.ts";
import { PROBLEMS_COPY } from "@/ui/copy/problems.ts";
import { type TestData, test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";
import { memoryField } from "./memory-page.ts";
import { fillWhenReady, waitForHydrated } from "./page-helpers.ts";

const THEIR_MEMORY = "- [ ] Rig the fox";

async function expectNotFound(page: Page): Promise<void> {
  await expect(
    page.getByRole("heading", { name: PROBLEMS_COPY.notFoundHeading }),
  ).toBeVisible();
  await expect(page.getByText(userMessage("not-found"))).toBeVisible();
}

// Points the page's hidden id field at another user's row, as a forged
// request would, before she submits its form.
async function forgeHiddenId(
  page: Page,
  field: "projectId" | "chatId",
  id: string,
): Promise<void> {
  await page
    .locator(`input[name="${field}"]`)
    .evaluate((element, value): void => {
      if (element instanceof HTMLInputElement) {
        element.value = value;
      }
    }, id);
}

// What a test of this case uses: her account, page and data, and the
// other user's.
interface CaseArgs {
  readonly account: User;
  readonly page: Page;
  readonly testData: TestData;
  readonly otherAccount: User;
  readonly otherTestData: TestData;
  readonly browser: Browser;
}

async function expectPageNotFound(page: Page, address: string): Promise<void> {
  await page.goto(address);
  await expectNotFound(page);
}

// Checks the viewer's projects list holds their own project and not the
// other's.
async function expectOnlyOwnProject(
  viewer: Page,
  own: Project,
  other: Project,
): Promise<void> {
  await viewer.goto("/projects");
  await expect(
    viewer.getByRole("main").getByRole("list").getByRole("link"),
  ).toHaveText([own.name]);
  await expect(viewer.getByText(other.name)).toHaveCount(0);
}

// Checks the viewer's New Chat project picker offers their own project and
// not the other's.
async function expectOnlyOwnProjectToChat(
  viewer: Page,
  own: Project,
): Promise<void> {
  await viewer.goto("/chats/new");
  await expect(
    viewer
      .getByRole("combobox", { name: NEW_CHAT_COPY.projectLabel })
      .getByRole("option"),
  ).toHaveText([own.name]);
}

async function openTheirPages({
  account,
  otherTestData,
  page,
}: CaseArgs): Promise<void> {
  const theirs = await otherTestData.project();
  const theirChat = await otherTestData.chat(theirs);
  await logIn(page, account);

  await expectPageNotFound(page, `/projects/${theirs.id}`);
  await expectPageNotFound(page, `/projects/${theirs.id}/memory`);
  await expectPageNotFound(page, `/chats/${theirChat.id}`);
}

async function listOwnProjects({
  account,
  browser,
  otherAccount,
  otherTestData,
  page,
  testData,
}: CaseArgs): Promise<void> {
  const mine = await testData.project();
  const theirs = await otherTestData.project();
  const theirContext = await browser.newContext();
  const theirPage = await theirContext.newPage();
  await logIn(page, account);
  await logIn(theirPage, otherAccount);

  await expectOnlyOwnProject(page, mine, theirs);
  await expectOnlyOwnProject(theirPage, theirs, mine);
  await theirContext.close();
}

// User A clones a buddy; user B's buddies page doesn't list it.
async function listOwnPersonas({
  account,
  browser,
  otherAccount,
  page,
}: CaseArgs): Promise<void> {
  const theirContext = await browser.newContext();
  const theirPage = await theirContext.newPage();
  await logIn(page, account);
  await logIn(theirPage, otherAccount);
  await page.goto("/buddies");
  const customizeHippy = page.getByRole("button", {
    exact: true,
    name: PERSONAS_COPY.customizeLabel("Hippy"),
  });
  await waitForHydrated(customizeHippy);
  await customizeHippy.click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Hippy (clone)" }),
  ).toBeVisible();

  await theirPage.goto("/buddies");
  await expect(
    theirPage.getByRole("heading", { level: 1, name: PERSONAS_COPY.heading }),
  ).toBeVisible();
  await expect(theirPage.getByText(PERSONAS_COPY.noOwn)).toBeVisible();
  await expect(theirPage.getByText("Hippy (clone)")).toHaveCount(0);
  await theirContext.close();
}

// User B's persona page, and an id that is no persona's, are not found to
// user A.
async function openTheirPersona({
  account,
  otherAccount,
  page,
}: CaseArgs): Promise<void> {
  const theirs = await clonePersona(otherAccount.id, "hippy");
  if (theirs === undefined) {
    throw new Error("Hippy could not be cloned");
  }
  await logIn(page, account);

  await expectPageNotFound(page, `/buddies/${theirs.id}`);
  await expectPageNotFound(page, `/buddies/${crypto.randomUUID()}`);
  await expectPageNotFound(page, "/buddies/not-a-persona");
  await expectPageNotFound(page, "/buddies/HIPPY");
}

async function chatInOwnProjects({
  account,
  browser,
  otherAccount,
  otherTestData,
  page,
  testData,
}: CaseArgs): Promise<void> {
  const mine = await testData.project();
  const theirs = await otherTestData.project();
  const theirContext = await browser.newContext();
  const theirPage = await theirContext.newPage();
  await logIn(page, account);
  await logIn(theirPage, otherAccount);

  await expectOnlyOwnProjectToChat(page, mine);
  await expectOnlyOwnProjectToChat(theirPage, theirs);
  await theirContext.close();
}

async function askInTheirChat({
  account,
  otherAccount,
  otherTestData,
  page,
}: CaseArgs): Promise<void> {
  const theirChat = await otherTestData.chat(await otherTestData.project());
  await logIn(page, account);

  const response = await page.request.post("/api/chat", {
    data: {
      id: theirChat.id,
      message: {
        id: crypto.randomUUID(),
        role: "user",
        parts: [{ type: "text", text: "Whose chat is this?" }],
      },
    },
  });

  expect(response.status()).toBe(HTTP_STATUS.notFound);
  expect(readAppErrorCase(await response.text())).toBe("not-found");
  expect(await getChat(otherAccount.id, theirChat.id)).toBeDefined();
}

async function saveTheirMemory({
  account,
  otherAccount,
  otherTestData,
  page,
  testData,
}: CaseArgs): Promise<void> {
  const mine = await testData.project();
  const theirs = await otherTestData.project();
  await logIn(page, account);
  await page.goto(`/projects/${mine.id}/memory`);
  await fillWhenReady(memoryField(page), THEIR_MEMORY);
  await forgeHiddenId(page, "projectId", theirs.id);
  await page.getByRole("button", { name: MEMORY_COPY.save }).click();

  await expectNotFound(page);
  expect((await readMemory(otherAccount.id, theirs.id)).text).toBe("");
  expect((await readMemory(account.id, mine.id)).text).toBe("");
}

async function renameTheirChat({
  account,
  otherAccount,
  otherTestData,
  page,
  testData,
}: CaseArgs): Promise<void> {
  const myChat = await testData.chat(await testData.project());
  const theirChat = await otherTestData.chat(await otherTestData.project());
  await logIn(page, account);
  await page.goto(`/chats/${myChat.id}`);
  const rename = page.getByRole("button", { name: CHAT_NAME_COPY.rename });
  await waitForHydrated(rename);
  await rename.click();
  await fillWhenReady(
    page.getByRole("textbox", { name: CHAT_NAME_COPY.label }),
    "Mine now",
  );
  await forgeHiddenId(page, "chatId", theirChat.id);
  await page.getByRole("button", { name: CHAT_NAME_COPY.save }).click();

  await expectNotFound(page);
  expect((await getChat(otherAccount.id, theirChat.id))?.name).toBeUndefined();
  expect((await getChat(account.id, myChat.id))?.name).toBeUndefined();
}

test.describe("use_case_private_data", () => {
  test(
    "another user's project, memory and chat pages can't be found",
    openTheirPages,
  );
  test("each sees only their own projects", listOwnProjects);
  test("another user's buddy is never listed", listOwnPersonas);
  test(
    "another user's persona page, or an unknown one, can't be found",
    openTheirPersona,
  );
  test(
    "each can start a new chat only in their own projects",
    chatInOwnProjects,
  );
  test("the chat API answers another user's chat as not found", askInTheirChat);
  test(
    "saving another user's memory is not found, and saves nothing",
    saveTheirMemory,
  );
  test(
    "renaming another user's chat is not found, and renames nothing",
    renameTheirChat,
  );
});
