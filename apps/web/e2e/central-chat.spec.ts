// Kept in Playwright: it signs in through the pages, follows links between
// them, reloads and reads the rows the server saved.
// The central chat in use-cases/chats.md: the one chat of hers in no
// project, at /chat, opened from Home or the header. Sign-in still lands on
// Home, not on the chat.
import { expect, type Page } from "@playwright/test";
import { DEFAULT_BUDDY_ID } from "@/buddies/index.ts";
import { getOrCreateCentralChat } from "@/chats/central-chat.ts";
import { listChats } from "@/chats/store.ts";
import { editMemory, readMemory } from "@/memory/memory-store.ts";
import { listProjects } from "@/projects/store.ts";
import { MONTHLY_QUOTA_MICRO_USD } from "@/quota/quota-terms.ts";
import { CHAT_COPY, CHAT_NAME_COPY } from "@/ui/copy/chat.ts";
import { HOME_COPY } from "@/ui/copy/site.ts";
import {
  buddyName,
  chatMessages,
  citations,
  exchange,
  expectMessages,
  manualSection,
  sendMessage,
} from "./chat-page.ts";
import { spend, test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";
import { alertIn } from "./page-helpers.ts";
import { quotaMessage } from "./quota-reset-days.ts";
import { signInByLink } from "./sign-in-pages.ts";

const HIPPY = buddyName(DEFAULT_BUDDY_ID);
// A word in no manual section but the one this spec adds, so a search finds
// it and the reply cites it.
const TOPIC = "quibblewand";
const QUIBBLEWAND = manualSection(
  "modeling/meshes/editing/edge/quibblewand",
  "quibblewand-edges",
  "Quibblewand Edges",
  "Press Ctrl-Shift-Q to quibblewand the selected edges.",
);
const FIRST_MESSAGE = "How do I bevel an edge?";
const IDEA = "I'd like to model a low-poly fox one day.";
const OVER_QUOTA = "And then what?";
// Her idea and its reply, then her search and its answer.
const MESSAGES_BEFORE_QUOTA = 4;

function banner(page: Page): ReturnType<Page["getByRole"]> {
  return page.getByRole("banner");
}

// Signs in through the pages, lands on Home, and opens the chat from Home's
// Chat link, the first time she sees it: no name yet, and no link back.
async function openFromHome(page: Page, email: string): Promise<void> {
  await signInByLink(page, email);
  await expect(page).toHaveURL("/");
  await page
    .getByRole("main")
    .getByRole("link", { name: HOME_COPY.chatLink, exact: true })
    .click();
  await expect(page).toHaveURL("/chat");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    `${CHAT_NAME_COPY.fallback} ${CHAT_COPY.heading(HIPPY)}`,
  );
  await expect(page.getByRole("main").getByRole("link")).toHaveCount(0);
}

test("use_case_central_chat", async ({ account, page, testData }) => {
  await test.step("she signs in to Home, whose Chat link opens the central chat", async () => {
    await openFromHome(page, account.email);
  });

  await test.step("the header's Chat link opens it from the projects list", async () => {
    await page.goto("/projects");
    await banner(page)
      .getByRole("link", { name: CHAT_COPY.headerLink, exact: true })
      .click();
    await expect(page).toHaveURL("/chat");
  });

  await test.step("a message gets a reply, still there after a reload", async () => {
    await sendMessage(page, FIRST_MESSAGE);
    await expectMessages(page, exchange(HIPPY, FIRST_MESSAGE));

    await page.reload();
    await expectMessages(page, exchange(HIPPY, FIRST_MESSAGE));
  });

  await test.step("it is in no project's chats", async () => {
    const project = await testData.project();
    const central = await getOrCreateCentralChat(account.id);

    expect(await listChats(account.id, project.id)).toEqual([]);
    await page.goto(`/projects/${project.id}`);
    await expect(
      page.getByRole("heading", { level: 1, name: project.name }),
    ).toBeVisible();
    await expect(page.locator(`a[href="/chats/${central.id}"]`)).toHaveCount(0);
  });
});

test("use_case_talk_idea_through", async ({ account, page, testData }) => {
  const project = await testData.project();
  await editMemory(account.id, {
    projectId: project.id,
    edit: { oldText: "", newText: "- [ ] Bevel the donut" },
    author: "user",
  });
  const memory = await readMemory(account.id, project.id);
  await testData.manualSections([QUIBBLEWAND]);
  await logIn(page, account);
  await page.goto("/chat");

  await test.step("she talks an idea through, and gets a reply", async () => {
    await sendMessage(page, IDEA);
    await expectMessages(page, exchange(HIPPY, IDEA));
  });

  await test.step("a Blender answer cites the manual", async () => {
    await sendMessage(page, `/mock-search ${TOPIC}`);
    await expect(citations(page).getByRole("link")).toHaveText([
      QUIBBLEWAND.title,
    ]);
  });

  await test.step("no project is made and no memory changes", async () => {
    const projects = await listProjects(account.id);
    expect(projects.map(({ id }) => id)).toEqual([project.id]);
    expect(await readMemory(account.id, project.id)).toEqual(memory);
  });

  await test.step("over quota, her message is refused and given back", async () => {
    const since = new Date();
    await spend(account, MONTHLY_QUOTA_MICRO_USD);

    await sendMessage(page, OVER_QUOTA);

    await expect(alertIn(page)).toHaveText(quotaMessage(since));
    await expect(
      page.getByRole("textbox", { name: CHAT_COPY.messageLabel }),
    ).toHaveValue(OVER_QUOTA);
    await expect(chatMessages(page)).toHaveCount(MESSAGES_BEFORE_QUOTA);
  });
});
