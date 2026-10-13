// "use_case_over_quota" in use-cases/: the month's Claude quota used up. Her
// spend starts a micro-USD below the quota, so the mock tutor's first reply,
// charged at Sonnet's prices like Claude's, crosses it.
import { expect, type Locator, type Page } from "@playwright/test";
import { listChats } from "@/chats/store.ts";
import { listProjects } from "@/projects/store.ts";
import {
  MONTHLY_QUOTA_MICRO_USD,
  quotaResetsOn,
  quotaUsedUpMessage,
} from "@/quota/quota-terms.ts";
import { mockChatName } from "@/tutor/mock-chat-name.ts";
import { CHAT_COPY, NEW_CHAT_COPY } from "@/ui/copy/chat.ts";
import { PROJECT_COPY, PROJECTS_COPY } from "@/ui/copy/projects.ts";
import {
  exchange,
  expectMessages,
  personaName,
  sendMessage,
} from "./chat-page.ts";
import { spend, test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";

// The messages the chat has after her first message and its reply.
const AFTER_FIRST_EXCHANGE = 2;
// How long one load may take to show the chat's name before a reload.
const NAME_WAIT_MS = 1000;
const NEW_CHAT_PATH = /\/chats\/new/u;

// The page's own alert. Next's route announcer is an alert too, outside the
// main landmark.
function alertIn(page: Page): Locator {
  return page.getByRole("main").getByRole("alert");
}

// The quota message, with the 1st of next month in UTC as its reset day.
function quotaMessage(): string {
  return quotaUsedUpMessage(quotaResetsOn(new Date()));
}

// Expects the chat as the server saved it, before any reload: the refused
// message and an empty reply to it gone, and its text back in the box.
async function expectTakenBack(
  page: Page,
  saved: readonly string[],
  refused: string,
): Promise<void> {
  await expectMessages(page, saved);
  await expect(
    page.getByRole("textbox", { name: CHAT_COPY.messageLabel }),
  ).toHaveValue(refused);
}

test("use_case_over_quota", async ({ account, page, testData }) => {
  const project = await testData.project();
  const chat = await testData.chat(project, "mr-tee");
  const tutor = personaName(chat.personaId);
  const first = "Bevel a donut";
  const second = "Now add sprinkles";
  await spend(account, MONTHLY_QUOTA_MICRO_USD - 1);
  await logIn(page, account);
  await page.goto(`/chats/${chat.id}`);

  await test.step("the reply that crosses the quota finishes in full, and names the chat", async () => {
    await sendMessage(page, first);
    await expectMessages(page, exchange(tutor, first));

    const named = page.getByRole("heading", {
      exact: true,
      level: 1,
      name: `${mockChatName(first, AFTER_FIRST_EXCHANGE)} ${CHAT_COPY.heading(tutor)}`,
    });
    await expect(async () => {
      await page.reload();
      await expect(named).toBeVisible({ timeout: NAME_WAIT_MS });
    }).toPass();
  });

  await test.step("her next message gets the quota message with its reset day, no reply, and its text back in the box", async () => {
    await sendMessage(page, second);

    await expect(alertIn(page)).toHaveText(quotaMessage());
    await expectTakenBack(page, exchange(tutor, first), second);
    await page.reload();
    await expectMessages(page, exchange(tutor, first));
  });

  await test.step("a new chat shows the quota message and starts nothing", async () => {
    await page.goto(`/projects/${project.id}`);
    await page.getByRole("link", { name: PROJECT_COPY.startChat }).click();
    await page.getByRole("button", { name: NEW_CHAT_COPY.start }).click();

    await expect(alertIn(page)).toHaveText(quotaMessage());
    await expect(page).toHaveURL(NEW_CHAT_PATH);
    expect(await listChats(account.id, project.id)).toHaveLength(1);
  });

  await test.step("a new project shows the quota message and creates nothing", async () => {
    const name = `Fox ${crypto.randomUUID()}`;
    await page.goto("/projects");
    await page
      .getByRole("textbox", { name: PROJECTS_COPY.nameLabel })
      .fill(name);
    await page.getByRole("button", { name: PROJECTS_COPY.create }).click();

    await expect(alertIn(page)).toHaveText(quotaMessage());
    await expect(page).toHaveURL("/projects");
    const projects = await listProjects(account.id);
    expect(projects.map(({ id }) => id)).toEqual([project.id]);
  });
});

test.describe("use_case_over_quota", () => {
  test("an empty chat's refused first message leaves it empty, with no reply", async ({
    account,
    page,
    testData,
  }) => {
    const chat = await testData.chat(await testData.project());
    const first = "Bevel a donut";
    await spend(account, MONTHLY_QUOTA_MICRO_USD);
    await logIn(page, account);
    await page.goto(`/chats/${chat.id}`);

    await sendMessage(page, first);

    await expect(alertIn(page)).toHaveText(quotaMessage());
    await expectTakenBack(page, [], first);
  });
});
