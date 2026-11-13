// A quest's page in Chromium and WebKit: its frame, sections, status
// actions, and its loading and error
// states. The conversation it opens on is conversation.browser.test.tsx's.

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import QuestError from "@/app/(workspace)/quests/[questId]/(overview)/error.tsx";
import QuestLayout from "@/app/(workspace)/quests/[questId]/(overview)/layout.tsx";
import QuestLoading from "@/app/(workspace)/quests/[questId]/(overview)/loading.tsx";
import QuestPage from "@/app/(workspace)/quests/[questId]/(overview)/page.tsx";
import type { listMessages, readStoppedReply } from "@/chats/store.ts";
import type { readQuestConversation } from "@/conversations/start-quest.ts";
import type { getQuest } from "@/quests/store.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import { CONSTRUCT_DISCOVERY_COPY } from "@/ui/copy/construct-discovery.ts";
import { QUEST_CONVERSATION_COPY } from "@/ui/copy/conversation.ts";
import { PROBLEMS_COPY } from "@/ui/copy/problems.ts";
import { QUEST_COPY } from "@/ui/copy/quests.ts";
import {
  SIGNED_IN_USER,
  signInAs,
} from "../../../../auth/current-user-test-kit.ts";
import { applyTheme } from "../../../../themes/theme-test-kit.ts";
import {
  LAPTOP_VIEWPORT,
  NARROWEST_VIEWPORT,
  PHONE_VIEWPORT,
  setViewport,
} from "../../../../viewports-test-kit.ts";
import { inWorkspace } from "../../../workspace-test-kit.tsx";
import { FOX_CONVERSATION, FOX_QUEST } from "../../page-fixtures.ts";

vi.mock("@/ideas/idea-store.ts", () => ({
  listIdeas: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/ideas/idea-actions.ts", () => ({ changeIdeaAction: vi.fn() }));
vi.mock("@/app/(workspace)/quests/actions.ts", () => ({
  startQuestAction: (): never => {
    throw new Error("Quest creation is not available in a quest conversation");
  },
}));

vi.mock(
  "@/plan/plan-actions.ts",
  () => import("../../../../plan/plan-actions-test-kit.ts"),
);
vi.mock(
  "@/auth/current-user.ts",
  () => import("../../../../auth/current-user-test-kit.ts"),
);
const stores = vi.hoisted(() => ({
  listMessages: vi.fn<typeof listMessages>(),
  readStoppedReply: vi.fn<typeof readStoppedReply>(),
  readQuestConversation: vi.fn<typeof readQuestConversation>(),
  getQuest: vi.fn<typeof getQuest>(),
}));
vi.mock("@/quests/store.ts", () => ({
  getQuest: stores.getQuest,
}));
vi.mock("@/chats/store.ts", () => ({
  getChat: vi.fn(),
  listMessages: stores.listMessages,
  readStoppedReply: stores.readStoppedReply,
}));
vi.mock("@/conversations/start-quest.ts", () => ({
  readQuestConversation: stores.readQuestConversation,
  startQuestConversation: vi.fn(),
}));
vi.mock("@/gold/gold-store.ts", () => ({
  readGoldBalance: vi.fn().mockResolvedValue(0),
}));
vi.mock(
  "next/navigation",
  () => import("../../../../components/router-test-kit.ts"),
);
vi.mock("@/milestones/milestone-store.ts", () => ({
  listMilestones: () => Promise.resolve([]),
}));
vi.mock(
  "@/plan/plan-store.ts",
  () => import("../../../../plan/plan-store-test-kit.ts"),
);
vi.mock("@/app/(workspace)/quests/[questId]/(overview)/actions.ts", () => ({
  editMilestoneAction: vi.fn(),
  deleteMilestoneAction: vi.fn(),
  startConversationAction: vi.fn(),
}));
vi.mock("@/constructs/own-construct-choices.ts", () => ({
  ownConstructChoices: () => Promise.resolve([]),
}));

// The widest the page's column grows: from the xl breakpoint, the quest's
// conversation and its plan sit side by side.
const REMOVED_CONTEXT_LINK = /Journal|Versions/u;

const PARAMS = Promise.resolve({ questId: FOX_QUEST.id });

async function renderQuest(section = "conversation"): Promise<void> {
  const content = await QuestPage({
    params: PARAMS,
    searchParams: Promise.resolve({ section }),
  });
  await render(
    inWorkspace(<QuestLayout params={PARAMS}>{content}</QuestLayout>),
  );
}

// The quest's conversation, which its page opens on.
function composer(): ReturnType<typeof page.getByRole> {
  return page.getByRole("textbox", { name: CHAT_COPY.messageLabel });
}

beforeEach(() => {
  signInAs(SIGNED_IN_USER);
  stores.readQuestConversation.mockResolvedValue(FOX_CONVERSATION);
  stores.listMessages.mockResolvedValue([]);
  stores.getQuest.mockResolvedValue(FOX_QUEST);
});

afterEach(() => {
  vi.clearAllMocks();
});

test.each(["completed", "abandoned"] as const)(
  "a %s quest page keeps its Plan and conversation after its status changes",
  async (status) => {
    stores.getQuest.mockResolvedValue({ ...FOX_QUEST, status });
    await renderQuest();
    await page.getByRole("button", { name: "Open quest sidebar" }).click();
    await expect
      .element(page.getByRole("tab", { name: "Plan", exact: true }))
      .toHaveAttribute("aria-selected", "true");
    await expect.element(composer()).toBeVisible();
  },
);

describe.each(["light", "dark"])("quest frame in %s", (mode) => {
  test.each(
    [NARROWEST_VIEWPORT, PHONE_VIEWPORT, LAPTOP_VIEWPORT].flatMap((viewport) =>
      [true, false].map((populated) => ({ viewport, populated })),
    ),
  )(
    "preserves real quest regions and error recovery at $viewport.width px, populated $populated",
    async ({ viewport, populated }) => {
      applyTheme("parchment", mode);
      await setViewport(viewport);
      const screen = await render(
        inWorkspace(
          <QuestLayout params={PARAMS}>
            <QuestLoading />
          </QuestLayout>,
        ),
      );
      const busy = page.getByRole("status", { name: QUEST_COPY.loading });
      expect(page.getByRole("status").all()).toHaveLength(1);
      await expect.element(busy).toHaveAttribute("aria-busy", "true");
      await expect.element(page.getByRole("link")).not.toBeInTheDocument();
      await expect.element(page.getByRole("listitem")).not.toBeInTheDocument();
      const frame = busy.element().parentElement;
      const before = frame?.getBoundingClientRect();
      const loadingWorkspace = busy
        .element()
        .firstElementChild?.getBoundingClientRect();
      expect(before?.width).toBeLessThanOrEqual(viewport.width);
      if (!populated) {
        stores.readQuestConversation.mockResolvedValue(undefined);
      }
      const content = await QuestPage({
        params: PARAMS,
        searchParams: Promise.resolve({}),
      });
      await screen.rerender(
        inWorkspace(<QuestLayout params={PARAMS}>{content}</QuestLayout>),
      );
      await expect
        .element(page.getByRole("button", { name: "Quest actions" }))
        .not.toBeInTheDocument();
      const workspace = frame?.firstElementChild;
      expect(workspace?.getBoundingClientRect()).toMatchObject({
        x: loadingWorkspace?.x,
        width: loadingWorkspace?.width,
      });
      expect(frame?.getBoundingClientRect()).toMatchObject({
        x: before?.x,
        width: before?.width,
      });
      await expect
        .element(page.getByRole("status", { name: QUEST_COPY.loading }))
        .not.toBeInTheDocument();
      let result = page.getByText(QUEST_CONVERSATION_COPY.notStarted);
      if (populated) {
        result = composer();
      }
      await expect.element(result).toBeVisible();
      const retry = vi.fn<() => void>();
      await screen.rerender(
        inWorkspace(
          <QuestLayout params={PARAMS}>
            <QuestError
              error={new Error("Private quest detail")}
              retry={retry}
            />
          </QuestLayout>,
        ),
      );
      expect(frame?.getBoundingClientRect()).toMatchObject({
        x: before?.x,
        width: before?.width,
      });
      await expect.element(page.getByRole("alert")).toBeVisible();
      await expect
        .element(page.getByText("Private quest detail"))
        .not.toBeInTheDocument();
      const button = page.getByRole("button", { name: PROBLEMS_COPY.retry });
      const target = button.element().getBoundingClientRect();
      expect(target.left).toBeGreaterThan(0);
      expect(target.right).toBeLessThan(viewport.width);
      await button.click();
      expect(retry).toHaveBeenCalledOnce();
      await expect
        .element(page.getByRole("link", { name: PROBLEMS_COPY.questsLink }))
        .toBeVisible();
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
        viewport.width,
      );
      await setViewport(LAPTOP_VIEWPORT);
    },
  );
});

test("the quest opens directly on the conversation without a portrait bar", async () => {
  await setViewport(LAPTOP_VIEWPORT);
  await renderQuest();
  expect(
    page.getByRole("heading", { level: 1 }).query(),
    "the quest's name is the trail band's heading, not the frame's",
  ).toBeNull();
  await expect
    .element(page.getByRole("navigation", { name: QUEST_COPY.navigation }))
    .not.toBeInTheDocument();
  const portrait = page.getByRole("button", {
    name: CONSTRUCT_DISCOVERY_COPY.openProfile(FOX_CONVERSATION.construct.name),
  });
  await expect.element(portrait).not.toBeInTheDocument();
  await expect.element(composer()).toBeVisible();
  await expect
    .element(page.getByRole("button", { name: "Quest actions" }))
    .not.toBeInTheDocument();
  await Promise.all(
    ["Finish Quest", "Abandon Quest"].map(async (name) => {
      await expect
        .element(page.getByRole("button", { name, exact: true }))
        .not.toBeInTheDocument();
    }),
  );
});

test("the Plan section shows the todo list without Goal, Preferences or Journal", async () => {
  await renderQuest("plan");
  await expect
    .element(page.getByRole("tabpanel", { name: "Plan", exact: true }))
    .toBeVisible();
  await page.getByRole("button", { name: "Add a step", exact: true }).click();
  await expect.element(page.getByPlaceholder("Add a step")).toBeVisible();
  for (const name of ["Goal", "Preferences"]) {
    expect(
      page.getByRole("heading", { name, exact: true }).elements(),
    ).toHaveLength(0);
  }
  expect(
    page.getByRole("link", { name: REMOVED_CONTEXT_LINK }).elements(),
  ).toHaveLength(0);
});

test("Ideas opens as a separate quest section beside Plan", async () => {
  await renderQuest("ideas");
  await expect
    .element(page.getByRole("tab", { name: "Ideas", exact: true }))
    .toHaveAttribute("aria-selected", "true");
  await expect
    .element(page.getByRole("tabpanel", { name: "Ideas", exact: true }))
    .toBeVisible();
  await expect
    .element(page.getByRole("button", { name: "Add idea" }))
    .toBeVisible();
});
