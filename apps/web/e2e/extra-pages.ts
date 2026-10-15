// For each of the site's extras (src/flags/flags.ts), a page that shows it,
// for hide-each-extra.spec.ts: one entry per flag, so tsc fails until a new
// flag has a page here.
import { expect, type Page } from "@playwright/test";
import { chatNameFixture } from "@/chats/chat-name-fixtures.ts";
import { renameChat } from "@/chats/store.ts";
import { extraTag, type FlagId } from "@/flags/flags.ts";
import type { Project } from "@/projects/store.ts";
import { mockWorkingNoteText } from "@/tutor/mock-working-note.ts";
import { CITATIONS_COPY } from "@/ui/copy/chat.ts";
import { FLAG_COPY } from "@/ui/copy/settings.ts";
import { lastMessage, openChat, sendMessage, tutorEdits } from "./chat-page.ts";
import type { TestData } from "./fixtures.ts";
import { logIn } from "./log-in.ts";
import { openLongChat, scrollToBottom } from "./long-chat.ts";
import {
  extrasOnScreen,
  pageDecoration,
  switchExtra,
} from "./settings-page.ts";
import { waitUntilSettled } from "./visual/visual-page.ts";

const TOPIC = "zibble";
const CHAT_NAME = "Bevel the den's roof";

// A page that shows an extra.
interface ExtraPage {
  // Signs in, makes what the page shows in project, and returns the page's
  // address.
  readonly make: (
    page: Page,
    testData: TestData,
    project: Project,
  ) => Promise<string>;
  // Whether the extra shows only at the page's end, as the pinned chat
  // header does, in a long chat.
  readonly atEnd: boolean;
  // How many of the extra's parts show on screen.
  readonly onScreen: (page: Page, id: FlagId) => Promise<number>;
}

// A chat whose reply has a working note and a search line.
async function chatWithWorkingNote(
  page: Page,
  testData: TestData,
  project: Project,
): Promise<string> {
  const chat = await testData.chat(project);
  await openChat(page, testData.account, chat);
  await sendMessage(page, `/mock-working-note ${TOPIC}`);
  const reply = lastMessage(page);
  await expect(reply.getByText(mockWorkingNoteText(TOPIC))).toBeVisible();
  await expect(reply.getByText(CITATIONS_COPY.searched(TOPIC))).toBeVisible();
  return `/chats/${chat.id}`;
}

// A chat in which the tutor has changed the project's memory.
async function chatWithMemoryChange(
  page: Page,
  testData: TestData,
  project: Project,
): Promise<string> {
  const chat = await testData.chat(project);
  await openChat(page, testData.account, chat);
  await tutorEdits(page, "", "- Rig it");
  return `/chats/${chat.id}`;
}

// A chat several screens long.
async function longChat(
  page: Page,
  testData: TestData,
  project: Project,
): Promise<string> {
  const chat = await testData.chat(project);
  await openLongChat(page, testData.account, chat);
  return `/chats/${chat.id}`;
}

// The project's page, whose one chat is named.
async function projectWithNamedChat(
  page: Page,
  testData: TestData,
  project: Project,
): Promise<string> {
  const chat = await testData.chat(project);
  await renameChat(testData.account.id, chat.id, chatNameFixture(CHAT_NAME));
  await logIn(page, testData.account);
  return `/projects/${project.id}`;
}

// The page decoration has no tag: <body>'s background draws it, not an
// element of its own, so it shows while that background has an image.
async function decorationOnScreen(page: Page): Promise<number> {
  return Number((await pageDecoration(page)) !== "none");
}

// "persona-mechanics" and "interview-persona" are stored flag ids (cookie and
// account data), kept through the buddy rename (#116).
// How many of the persona-mechanics parts are laid out, wherever they are on
// the page: the buddy's own parts come first and fill the window, so its
// mechanics parts start below it.
function mechanicsLaidOut(page: Page, id: FlagId): Promise<number> {
  return page
    .locator(`[data-extra="${extraTag(id)["data-extra"]}"]`)
    .evaluateAll(
      (elements): number =>
        elements.filter((element) => element.checkVisibility()).length,
    );
}

const EXTRA_PAGES: Record<FlagId, ExtraPage> = {
  "working-notes": {
    make: chatWithWorkingNote,
    atEnd: false,
    onScreen: extrasOnScreen,
  },
  "memory-change-cards": {
    make: chatWithMemoryChange,
    atEnd: false,
    onScreen: extrasOnScreen,
  },
  "tool-lines": {
    make: chatWithWorkingNote,
    atEnd: false,
    onScreen: extrasOnScreen,
  },
  "pinned-chat-header": {
    make: longChat,
    atEnd: true,
    onScreen: extrasOnScreen,
  },
  "chat-names": {
    make: projectWithNamedChat,
    atEnd: false,
    onScreen: extrasOnScreen,
  },
  "page-decorations": {
    make: projectWithNamedChat,
    atEnd: false,
    onScreen: decorationOnScreen,
  },
  // The account page, whose meter shows this month's spend.
  "usage-meter": {
    make: async (page: Page, testData: TestData): Promise<string> => {
      await logIn(page, testData.account);
      return "/account";
    },
    atEnd: false,
    onScreen: extrasOnScreen,
  },
  // A built-in buddy's page, with its mechanics parts switched on, as
  // they are off by default.
  "persona-mechanics": {
    make: async (page: Page, testData: TestData): Promise<string> => {
      await logIn(page, testData.account);
      await switchExtra(page, FLAG_COPY.buddyMechanics.label, true, [
        "interview-persona",
      ]);
      return "/buddies/mr-tee";
    },
    atEnd: false,
    onScreen: mechanicsLaidOut,
  },
  // The projects page, whose New Project form has the buddy picker,
  // switched on, as it is off by default.
  "interview-persona": {
    make: async (page: Page, testData: TestData): Promise<string> => {
      await logIn(page, testData.account);
      await switchExtra(page, FLAG_COPY.interviewBuddy.label, true, [
        "persona-mechanics",
      ]);
      return "/projects";
    },
    atEnd: false,
    onScreen: extrasOnScreen,
  },
};

// Opens address, the page of extraPage, and waits until it has all of its
// content, scrolled to its end if the extra shows only there.
async function showExtraPage(
  page: Page,
  address: string,
  { atEnd }: ExtraPage,
): Promise<void> {
  await page.goto(address);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await waitUntilSettled(page);
  if (atEnd) {
    await scrollToBottom(page);
  }
}

export type { ExtraPage };
export { EXTRA_PAGES, showExtraPage };
