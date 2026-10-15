// "use_case_hide_extras" in use-cases/appearance.md, where it needs the
// server: a switched-off extra stays hidden after a reload and for her
// alone, and the pinned chat header, switched off, scrolls away with a long
// chat and leaves nothing behind over the conversation. That each switch
// hides only its own extra, and a chat keeps its citation and composer, is
// src/flags/hide-extras.browser.test.tsx's to check; that a switch applies
// at once, and that Settings fits the narrowest screen in every theme, is
// src/app/(workspace)/settings/flag-switches.browser.test.tsx's.
import { expect, type Page } from "@playwright/test";
import type { User } from "@/accounts/users-store.ts";
import { HIDE_ATTRIBUTE } from "@/flags/flag-choice.ts";
import { DEFAULT_HIDDEN_FLAGS, FLAG_IDS } from "@/flags/flags.ts";
import {
  mockWorkingNoteAnswer,
  mockWorkingNoteText,
} from "@/tutor/mock-working-note.ts";
import { CITATIONS_COPY } from "@/ui/copy/chat.ts";
import { FLAG_COPY, SETTINGS_COPY } from "@/ui/copy/settings.ts";
import {
  lastMessage,
  openChat,
  sendMessage,
  workingNotes,
} from "./chat-page.ts";
import { type TestData, test } from "./fixtures.ts";
import {
  oneScreenDown,
  openLongChat,
  scrollToBottom,
  showLongChat,
} from "./long-chat.ts";
import { switchExtra } from "./settings-page.ts";
import { signInByLink } from "./sign-in-pages.ts";

const TOPIC = "zibble";

// Checks that the chat's reply shows its answer and its search, and its
// working note only if notesShown.
async function expectReply(page: Page, notesShown: boolean): Promise<void> {
  const reply = lastMessage(page);
  await expect(reply.getByText(mockWorkingNoteAnswer(TOPIC))).toBeVisible();
  await expect(reply.getByText(CITATIONS_COPY.searched(TOPIC))).toBeVisible();
  await expect(workingNotes(reply)).toHaveCount(Number(notesShown));
  await expect(reply.getByText(mockWorkingNoteText(TOPIC))).toBeVisible({
    visible: notesShown,
  });
}

// The page, account and test data a test of this case uses.
interface CaseArgs {
  readonly page: Page;
  readonly account: User;
  readonly otherAccount: User;
  readonly testData: TestData;
}

async function hideWorkingNotesAndBringThemBack({
  page,
  account,
  otherAccount,
  testData,
}: CaseArgs): Promise<void> {
  const chat = await testData.chat(await testData.project());
  await openChat(page, account, chat);
  await sendMessage(page, `/mock-working-note ${TOPIC}`);
  await expectReply(page, true);

  await test.step("she opens Settings from the header and switches off working notes", async () => {
    await page
      .getByRole("banner")
      .getByRole("link", { name: SETTINGS_COPY.headerLink })
      .click();
    await expect(
      page.getByRole("heading", { level: 1, name: SETTINGS_COPY.heading }),
    ).toBeVisible();
    await switchExtra(page, FLAG_COPY.workingNotes.label, false, [
      "working-notes",
      ...DEFAULT_HIDDEN_FLAGS,
    ]);
  });

  await test.step("the chat hides the note, also after a reload", async () => {
    await page.goto(`/chats/${chat.id}`);
    await expectReply(page, false);
    await page.reload();
    await expectReply(page, false);
  });

  await test.step("switched back on, the note shows again", async () => {
    await switchExtra(page, FLAG_COPY.workingNotes.label, true, [
      ...DEFAULT_HIDDEN_FLAGS,
    ]);
    await page.goto(`/chats/${chat.id}`);
    await expectReply(page, true);
  });

  await test.step("another user, signed in on this browser, sees her own defaults", async () => {
    await switchExtra(page, FLAG_COPY.workingNotes.label, false, [
      "working-notes",
      ...DEFAULT_HIDDEN_FLAGS,
    ]);
    await page.context().clearCookies();
    await signInByLink(page, otherAccount.email);
    await expect(page.locator("html")).toHaveAttribute(
      HIDE_ATTRIBUTE,
      // "persona-mechanics" and "interview-persona" are stored flag ids (cookie
      // and account data), kept through the buddy rename (#116).
      "persona-mechanics interview-persona",
    );
    await page.goto("/settings");
    await expect(page.getByRole("switch")).toHaveCount(FLAG_IDS.length);
    await expect(page.getByRole("switch", { checked: false })).toHaveCount(
      DEFAULT_HIDDEN_FLAGS.length,
    );
  });
}

// Switched off, the chat's header scrolls away with a long chat, and a click
// one screen down reaches the conversation, which shows just as it does
// under the pinned header; switched back on, the header is pinned again.
async function unpinChatHeader({
  page,
  account,
  testData,
}: CaseArgs): Promise<void> {
  const project = await testData.project();
  const chat = await testData.chat(project);
  await openLongChat(page, account, chat);
  const backLink = page.getByRole("link", { name: project.name });
  const { label } = FLAG_COPY.pinnedChatHeader;

  await switchExtra(page, label, false, [
    "pinned-chat-header",
    ...DEFAULT_HIDDEN_FLAGS,
  ]);
  await showLongChat(page, chat);
  await scrollToBottom(page);
  await expect(backLink).not.toBeInViewport();
  const unpinned = await oneScreenDown(page);
  await unpinned.line.click({ trial: true });

  await switchExtra(page, label, true, [...DEFAULT_HIDDEN_FLAGS]);
  await showLongChat(page, chat);
  await scrollToBottom(page);
  await expect(backLink).toBeInViewport();
  const pinned = await oneScreenDown(page);
  expect(
    unpinned.band.equals(pinned.band),
    "nothing drawn over the conversation one screen down",
  ).toBe(true);
}

test.describe("use_case_hide_extras", () => {
  // Stays in Playwright: a reload, the saved cookie and another user's sign-in.
  test(
    "she hides working notes, and gets them back",
    hideWorkingNotesAndBringThemBack,
  );
  // Stays in Playwright: a long chat on the real chat page, scrolled.
  test(
    "the pinned chat header, switched off, scrolls away and leaves nothing behind",
    unpinChatHeader,
  );
});
