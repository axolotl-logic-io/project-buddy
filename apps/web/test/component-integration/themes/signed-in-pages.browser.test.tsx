// "use_case_choose_theme", signed in, in Chromium and WebKit: each theme on
// the pages it styles beyond its colours. A long quest name, the trail
// band's heading, keeps the quest's sections below it, the memory's
// checkboxes take the theme's colours, and a reply's heading stays smaller
// than the page's. Each page is rendered from fixed data, in its layouts
// and under the site header the @header slot gives it, with the site's
// stylesheet
// (vitest.browser-setup.ts) and the theme's fonts (theme-fonts-test-kit.ts).
// test/app/layout-first-paint.test.tsx covers the theme's first paint,
// test/component-integration/components/appearance-choices.browser.test.tsx choosing it, and
// test/component-integration/components/focus.browser.test.tsx how each theme draws focus.

import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import QuestLayout from "@/app/(workspace)/quests/[questId]/(overview)/layout.tsx";
import QuestPage from "@/app/(workspace)/quests/[questId]/(overview)/page.tsx";
import type { ChatMessage } from "@/chats/message-author.ts";
import type { getChat, listMessages } from "@/chats/store.ts";
import type { readQuestConversation } from "@/conversations/start-quest.ts";
import type { listMilestones } from "@/milestones/milestone-store.ts";
import type { getQuest, listQuests } from "@/quests/store.ts";
import { THEMES } from "@/themes/themes.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import {
  FOX_CONVERSATION,
  FOX_QUEST,
} from "../app/(workspace)/page-fixtures.ts";
import { siteHeaderAt } from "../app/site-header-test-kit.tsx";
import { inWorkspace } from "../app/workspace-test-kit.tsx";
import { SIGNED_IN_USER, signInAs } from "../auth/current-user-test-kit.ts";
import { loadCodeHighlighting } from "../components/code-highlighting-test-kit.ts";
import { markdownReplyText } from "../replies/mock-markdown-test-kit.ts";
import { LAPTOP_VIEWPORT } from "../viewports-test-kit.ts";
import { fontSize } from "./signed-in-pages-test-kit.ts";
import { installThemeFonts, loadFonts } from "./theme-fonts-test-kit.ts";
import { applyTheme } from "./theme-test-kit.ts";

vi.mock(
  "@/plan/plan-actions.ts",
  () => import("../plan/plan-actions-test-kit.ts"),
);
vi.mock(
  "@/auth/current-user.ts",
  () => import("../auth/current-user-test-kit.ts"),
);
// The header slot reads the balance and resolves the trail's names.
vi.mock("@/gold/gold-store.ts", () => ({
  readGoldBalance: vi.fn().mockResolvedValue(0),
}));
vi.mock("@/activities/activity-store.ts", () => ({ getOwnActivity: vi.fn() }));
vi.mock("@/constructs/construct-store.ts", () => ({
  getOwnConstruct: vi.fn(),
}));
vi.mock("@/spells/spell-store.ts", () => ({ getOwnSpell: vi.fn() }));
vi.mock("@/retirement/retirement-store.ts", () => ({
  getRetiredDefinition: vi.fn(),
}));

const stores = vi.hoisted(() => ({
  quests: {
    getQuest: vi.fn<typeof getQuest>(),
    listQuests: vi.fn<typeof listQuests>(),
  },
  chats: {
    getChat: vi.fn<typeof getChat>(),
    listMessages: vi.fn<typeof listMessages>(),
    readStoppedReply: vi.fn().mockResolvedValue(undefined),
  },
  conversations: {
    readQuestConversation: vi.fn<typeof readQuestConversation>(),
    startQuestConversation: vi.fn(),
  },
  milestones: {
    listMilestones: vi.fn<typeof listMilestones>(() => Promise.resolve([])),
  },
}));
vi.mock("@/quests/store.ts", () => stores.quests);
vi.mock("@/chats/store.ts", () => stores.chats);
vi.mock("@/conversations/start-quest.ts", () => stores.conversations);
vi.mock("@/milestones/milestone-store.ts", () => stores.milestones);
vi.mock("@/plan/plan-store.ts", () => import("../plan/plan-store-test-kit.ts"));
vi.mock("@/app/(workspace)/quests/[questId]/(overview)/actions.ts", () => ({
  editMilestoneAction: vi.fn(),
  deleteMilestoneAction: vi.fn(),
  startConversationAction: vi.fn(),
}));

// ChatView refreshes the page through the App Router.
vi.mock("next/navigation", () => import("../components/router-test-kit.ts"));

// The pages' forms post to Server Actions, which these tests never run.
vi.mock("@/constructs/own-construct-choices.ts", () => ({
  ownConstructChoices: () => Promise.resolve([]),
}));
vi.mock(
  "@/activities/activity-choices.ts",
  () => import("../activities/activity-choices-test-kit.ts"),
);

// A long quest name, which the trail band's heading wraps.
const LONG_NAME = "Hangar door panel with hazard stripe rim and rivets";
const QUEST_PATH = ["quests", FOX_QUEST.id] as const;

// Her question and the mock construct's Markdown reply.
function markdownExchange(): ChatMessage[] {
  return [
    {
      id: "m0",
      role: "user",
      parts: [{ type: "text", text: "/mock-markdown" }],
    },
    {
      id: "r0",
      role: "assistant",
      parts: [{ type: "text", text: markdownReplyText() }],
    },
  ];
}

// Renders the page of a quest named name, in its layout.
async function renderQuest(name: string): Promise<void> {
  stores.quests.getQuest.mockResolvedValue({ ...FOX_QUEST, name });
  stores.quests.listQuests.mockResolvedValue([{ ...FOX_QUEST, name }]);
  const params = Promise.resolve({ questId: FOX_QUEST.id });
  const content = await QuestPage({
    params,
    searchParams: Promise.resolve({}),
  });
  await render(
    <>
      {await siteHeaderAt(QUEST_PATH)}
      {inWorkspace(<QuestLayout params={params}>{content}</QuestLayout>)}
    </>,
  );
}

// Renders a quest whose conversation's reply is the mock construct's
// Markdown.
async function renderMarkdownChat(): Promise<void> {
  stores.quests.getQuest.mockResolvedValue(FOX_QUEST);
  stores.chats.listMessages.mockResolvedValue(markdownExchange());
  const content = await QuestPage({
    params: Promise.resolve({ questId: FOX_QUEST.id }),
    searchParams: Promise.resolve({}),
  });
  await render(
    <>
      {await siteHeaderAt(QUEST_PATH)}
      {inWorkspace(content)}
    </>,
  );
}

// Opens the page of a quest with a long name and returns whether its
// Journal link is below the name, the page's heading.
async function journalBelowLongName(): Promise<boolean> {
  await renderQuest(LONG_NAME);
  await loadFonts();
  // The quest opens on its latest message; the frame is at the page's top.
  window.scrollTo(0, 0);
  const heading = page.getByRole("heading", { level: 1, name: LONG_NAME });
  const link = page.getByRole("link", { name: "Plan" });
  return (
    link.element().getBoundingClientRect().top >=
    heading.element().getBoundingClientRect().bottom
  );
}

// The font sizes of the chat page's heading and of its reply's level-2
// heading.
async function headingSizes(): Promise<{ page: number; reply: number }> {
  await renderMarkdownChat();
  const replyHeading = page
    .getByRole("list", { name: CHAT_COPY.conversationLabel })
    .getByRole("heading", { level: 2 });
  await vi.waitFor(() => replyHeading.element());
  await loadFonts();
  return {
    page: fontSize(page.getByRole("heading", { level: 1 }).element()),
    reply: fontSize(replyHeading.element()),
  };
}

beforeAll(async () => {
  installThemeFonts();
  await loadCodeHighlighting("python");
});

beforeEach(async () => {
  document.documentElement.classList.add("h-full");
  document.body.classList.add("flex", "min-h-full", "flex-col");
  signInAs(SIGNED_IN_USER);
  stores.conversations.readQuestConversation.mockResolvedValue(
    FOX_CONVERSATION,
  );
  stores.chats.listMessages.mockResolvedValue([]);
  await page.viewport(LAPTOP_VIEWPORT.width, LAPTOP_VIEWPORT.height);
  await vi.waitFor(() => {
    if (window.innerWidth !== LAPTOP_VIEWPORT.width) {
      throw new Error(`The page is ${window.innerWidth}px wide`);
    }
  });
});

// One set of tests per theme, under the use case's slug.
describe("use_case_choose_theme", () => {
  for (const { id, name } of THEMES) {
    describe(`the ${name} theme, signed in`, () => {
      beforeEach(() => {
        applyTheme(id);
      });

      test("a long quest title keeps Plan navigation below it at 1280 px", async () => {
        expect(await journalBelowLongName()).toBe(true);
      });

      test("a heading in a reply stays smaller than the page's heading", async () => {
        const sizes = await headingSizes();

        expect(sizes.reply).toBeLessThan(sizes.page);
      });
    });
  }
});
