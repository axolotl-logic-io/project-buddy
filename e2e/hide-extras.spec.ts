// "use_case_hide_extras" in use-cases/appearance.md: the Settings page's
// switches hide the site's extras (src/flags/flags.ts) at once, in this
// browser, and show them again. The pinned chat header's switch is checked
// where that header is built.
import { expect, type Locator, type Page } from "@playwright/test";
import { chatNameFixture } from "@/chats/chat-name-fixtures.ts";
import { type Chat, renameChat } from "@/chats/store.ts";
import { hiddenFlagsCookie } from "@/flags/flag-choice.ts";
import { FLAG_IDS, type FlagId } from "@/flags/flags.ts";
import { DEFAULT_PERSONA_ID } from "@/personas/index.ts";
import type { Project } from "@/projects/store.ts";
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

const TOPIC = "zibble";
const CHAT_NAME = "Bevel the den's roof";
// The narrowest screen the site supports (WCAG 1.4.10), and the least height
// of a switch's target where the layout allows it (WCAG 2.5.5).
const NARROWEST_SCREEN = { width: 320, height: 640 } as const;
const TARGET_HEIGHT = 44;

function flagSwitch(page: Page, label: string): Locator {
  return page.getByRole("switch", { name: label });
}

// Waits until this browser has saved hidden as the user's choice, so the
// next page loads with it.
async function expectSaved(
  page: Page,
  hidden: readonly FlagId[],
): Promise<void> {
  const { name, value } = hiddenFlagsCookie(hidden);
  await expect
    .poll(
      async () =>
        (await page.context().cookies()).find((cookie) => cookie.name === name)
          ?.value,
    )
    .toBe(value);
}

// Switches the extra labelled label on or off on the Settings page, and
// waits until the choice, which then hides exactly hidden, is saved.
async function switchExtra(
  page: Page,
  label: string,
  on: boolean,
  hidden: readonly FlagId[],
): Promise<void> {
  await page.goto("/settings");
  const control = flagSwitch(page, label);
  await expect(control).toBeChecked({ checked: !on });
  await control.click();
  await expect(control).toBeChecked({ checked: on });
  await expectSaved(page, hidden);
}

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

// The page's decoration: the background image behind its body.
function pageDecoration(page: Page): Promise<string> {
  return page.evaluate(
    (): string => getComputedStyle(document.body).backgroundImage,
  );
}

// The page and test data a test of this case uses.
interface CaseArgs {
  readonly page: Page;
  readonly testData: TestData;
}

async function hideWorkingNotesAndBringThemBack({
  page,
  testData,
}: CaseArgs): Promise<void> {
  const chat = await testData.chat(await testData.project());
  await openChat(page, chat);
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
    ]);
  });

  await test.step("the chat hides the note, also after a reload", async () => {
    await page.goto(`/chats/${chat.id}`);
    await expectReply(page, false);
    await page.reload();
    await expectReply(page, false);
  });

  await test.step("switched back on, the note shows again", async () => {
    await switchExtra(page, FLAG_COPY.workingNotes.label, true, []);
    await page.goto(`/chats/${chat.id}`);
    await expectReply(page, true);
  });

  await test.step("a new visitor sees every extra, and every switch on", async () => {
    await switchExtra(page, FLAG_COPY.workingNotes.label, false, [
      "working-notes",
    ]);
    await page.context().clearCookies();
    await openChat(page, chat);
    await expectReply(page, true);
    await page.goto("/settings");
    await expect(page.getByRole("switch")).toHaveCount(FLAG_IDS.length);
    await expect(page.getByRole("switch", { checked: false })).toHaveCount(0);
  });
}

// In a chat with a working note, a search and a memory change: hides the
// memory change, then the search line, checking each time that the rest
// still shows.
async function hideChatExtras(page: Page, chat: Chat): Promise<void> {
  await openChat(page, chat);
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
  ]);
  await page.goto(`/chats/${chat.id}`);
  await expect(note).toBeVisible();
  await expect(memoryChange).toBeHidden();
  await expect(searchLine).toBeVisible();

  await switchExtra(page, FLAG_COPY.toolLines.label, false, [
    "memory-change-cards",
    "tool-lines",
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
  ]);
  expect(await pageDecoration(page)).toBe("none");
}

async function hideEachExtra({ page, testData }: CaseArgs): Promise<void> {
  const project = await testData.project();
  const chat = await testData.chat(project);
  await renameChat(chat.id, chatNameFixture(CHAT_NAME));
  await hideChatExtras(page, chat);
  await hidePageExtras(page, project);
}

async function fitNarrowestScreen({ page }: CaseArgs): Promise<void> {
  await page.setViewportSize(NARROWEST_SCREEN);
  await logIn(page);
  await page.goto("/settings");
  await expect(page.getByRole("switch")).toHaveCount(FLAG_IDS.length);

  const overflow = await page.evaluate(
    (): number =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  const targetHeights = await page
    .locator("label")
    .filter({ has: page.getByRole("switch") })
    .evaluateAll((labels): number[] =>
      labels.map((label) => label.getBoundingClientRect().height),
    );
  expect(targetHeights).toHaveLength(FLAG_IDS.length);
  expect(Math.min(...targetHeights)).toBeGreaterThanOrEqual(TARGET_HEIGHT);
}

test.describe("use_case_hide_extras", () => {
  test(
    "she hides working notes, and gets them back",
    hideWorkingNotesAndBringThemBack,
  );
  test("each switch hides only its own extra", hideEachExtra);
  test(
    "Settings fits the narrowest screen, with switches easy to tap",
    fitNarrowestScreen,
  );
});
