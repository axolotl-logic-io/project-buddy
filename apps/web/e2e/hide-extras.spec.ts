// "use_case_hide_extras" in use-cases/appearance.md: the Settings page's
// switches hide the site's extras (src/flags/flags.ts) at once, and show
// them again. Every switch is checked here, the pinned
// chat header's too: switched off, the header scrolls away with a long chat
// and leaves nothing behind over the conversation.
import { expect, type Page } from "@playwright/test";
import type { User } from "@/accounts/users-store.ts";
import { chatNameFixture } from "@/chats/chat-name-fixtures.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import { renameChat } from "@/chats/store.ts";
import { HIDE_ATTRIBUTE } from "@/flags/flag-choice.ts";
import { DEFAULT_HIDDEN_FLAGS, FLAG_IDS } from "@/flags/flags.ts";
import { DEFAULT_PERSONA_ID } from "@/personas/index.ts";
import type { Project } from "@/projects/store.ts";
import { THEME_ATTRIBUTE, themeChoiceCookie } from "@/themes/theme-choice.ts";
import { THEME_IDS, type ThemeId } from "@/themes/themes.ts";
import {
  mockWorkingNoteAnswer,
  mockWorkingNoteText,
} from "@/tutor/mock-working-note.ts";
import { CHAT_COPY, CHAT_NAME_COPY, CITATIONS_COPY } from "@/ui/copy/chat.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";
import { FLAG_COPY, SETTINGS_COPY } from "@/ui/copy/settings.ts";
import {
  lastMessage,
  openChat,
  personaName,
  sendMessage,
  tutorEdits,
  workingNotes,
} from "./chat-page.ts";
import { type TestData, test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";
import {
  oneScreenDown,
  openLongChat,
  scrollToBottom,
  showLongChat,
} from "./long-chat.ts";
import {
  pageDecoration,
  switchExtra,
  switchRowHeights,
} from "./settings-page.ts";
import { signInByLink } from "./sign-in-pages.ts";
import { NARROWEST_VIEWPORT } from "./viewports.ts";

const TOPIC = "zibble";
const CHAT_NAME = "Bevel the den's roof";
// The least height of a switch's target where the layout allows it (WCAG
// 2.5.5).
const TARGET_HEIGHT = 44;

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
      "persona-mechanics interview-persona",
    );
    await page.goto("/settings");
    await expect(page.getByRole("switch")).toHaveCount(FLAG_IDS.length);
    await expect(page.getByRole("switch", { checked: false })).toHaveCount(
      DEFAULT_HIDDEN_FLAGS.length,
    );
  });
}

// In a chat with a working note, a search and a memory change: hides the
// memory change, then the search line, checking each time that the rest
// still shows.
async function hideChatExtras(
  page: Page,
  account: User,
  chat: Chat,
): Promise<void> {
  await openChat(page, account, chat);
  await sendMessage(page, `/mock-working-note ${TOPIC}`);
  await expectReply(page, true);
  await tutorEdits(page, "", "- Rig it");
  const note = page.getByRole("note", { name: CHAT_COPY.workingNote });
  const memoryChange = page.getByRole("complementary", {
    name: MEMORY_COPY.changeLabel,
  });
  const searchLine = page.getByText(CITATIONS_COPY.searched(TOPIC));

  await switchExtra(page, FLAG_COPY.memoryChangeCards.label, false, [
    "memory-change-cards",
    ...DEFAULT_HIDDEN_FLAGS,
  ]);
  await page.goto(`/chats/${chat.id}`);
  await expect(note).toBeVisible();
  await expect(memoryChange).toBeHidden();
  await expect(searchLine).toBeVisible();

  await switchExtra(page, FLAG_COPY.toolLines.label, false, [
    "memory-change-cards",
    "tool-lines",
    ...DEFAULT_HIDDEN_FLAGS,
  ]);
  await page.goto(`/chats/${chat.id}`);
  await expect(note).toBeVisible();
  await expect(searchLine).toBeHidden();
  await expect(page.getByText(mockWorkingNoteAnswer(TOPIC))).toBeVisible();
}

// On the project's page, whose one chat is named CHAT_NAME: hides the chat
// names, then the page decoration, checking each time that the rest still
// shows.
async function hidePageExtras(page: Page, project: Project): Promise<void> {
  const tutor = personaName(DEFAULT_PERSONA_ID);
  await page.goto(`/projects/${project.id}`);
  const chatLink = page
    .getByRole("main")
    .getByRole("listitem")
    .getByRole("link");
  await expect(chatLink).toHaveAccessibleName(
    CHAT_NAME_COPY.listTitle(CHAT_NAME, tutor),
  );
  const decoration = await pageDecoration(page);
  expect(decoration).not.toBe("none");

  await switchExtra(page, FLAG_COPY.chatNames.label, false, [
    "memory-change-cards",
    "tool-lines",
    "chat-names",
    ...DEFAULT_HIDDEN_FLAGS,
  ]);
  await page.goto(`/projects/${project.id}`);
  await expect(chatLink).toHaveAccessibleName(tutor);
  await expect(chatLink).toHaveText(tutor, { useInnerText: true });
  expect(await pageDecoration(page)).toBe(decoration);

  await switchExtra(page, FLAG_COPY.pageDecorations.label, false, [
    "memory-change-cards",
    "tool-lines",
    "chat-names",
    "page-decorations",
    ...DEFAULT_HIDDEN_FLAGS,
  ]);
  expect(await pageDecoration(page)).toBe("none");
}

async function hideEachExtra({
  page,
  account,
  testData,
}: CaseArgs): Promise<void> {
  const project = await testData.project();
  const chat = await testData.chat(project);
  await renameChat(account.id, chat.id, chatNameFixture(CHAT_NAME));
  await hideChatExtras(page, account, chat);
  await hidePageExtras(page, project);
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

// At the narrowest screen, in theme, since each theme sets its own spacing
// and fonts: Settings doesn't scroll sideways, and each switch's row is a
// touch target tall.
function fitNarrowestScreen(theme: ThemeId): (args: CaseArgs) => Promise<void> {
  return async ({ page, account }: CaseArgs): Promise<void> => {
    await page.setViewportSize(NARROWEST_VIEWPORT);
    await logIn(page, account);
    const cookie = themeChoiceCookie({ theme, mode: "light" });
    await page.context().addCookies([{ ...cookie, url: page.url() }]);
    await page.goto("/settings");
    await expect(page.locator("html")).toHaveAttribute(THEME_ATTRIBUTE, theme);
    await expect(page.getByRole("switch")).toHaveCount(FLAG_IDS.length);
    const overflow = await page.evaluate(
      (): number =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const heights = await switchRowHeights(page);
    expect(Math.min(...heights)).toBeGreaterThanOrEqual(TARGET_HEIGHT);
  };
}

test.describe("use_case_hide_extras", () => {
  test(
    "she hides working notes, and gets them back",
    hideWorkingNotesAndBringThemBack,
  );
  test("each switch hides only its own extra", hideEachExtra);
  test(
    "the pinned chat header, switched off, scrolls away and leaves nothing behind",
    unpinChatHeader,
  );
  for (const theme of THEME_IDS) {
    test(
      `Settings fits the narrowest screen, with switches easy to tap, in ${theme}`,
      fitNarrowestScreen(theme),
    );
  }
});
