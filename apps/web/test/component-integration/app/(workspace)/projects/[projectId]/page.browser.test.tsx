// A quest's page in Chromium and WebKit: its frame, sections, status
// actions, and its loading and error
// states. The conversation it opens on is conversation.browser.test.tsx's.
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import ProjectError from "@/app/(workspace)/projects/[projectId]/(overview)/error.tsx";
import ProjectLayout from "@/app/(workspace)/projects/[projectId]/(overview)/layout.tsx";
import ProjectLoading from "@/app/(workspace)/projects/[projectId]/(overview)/loading.tsx";
import ProjectPage from "@/app/(workspace)/projects/[projectId]/(overview)/page.tsx";
import type { listMessages, readStoppedReply } from "@/chats/store.ts";
import type { readQuestConversation } from "@/conversations/start-quest.ts";
import type { getProject } from "@/projects/store.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import { CONSTRUCT_DISCOVERY_COPY } from "@/ui/copy/construct-discovery.ts";
import { QUEST_CONVERSATION_COPY } from "@/ui/copy/conversation.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";
import { PROBLEMS_COPY } from "@/ui/copy/problems.ts";
import { PROJECT_COPY } from "@/ui/copy/projects.ts";
import { WORKSPACES_COPY } from "@/ui/copy/workspaces.ts";
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
import { FOX_CONVERSATION, FOX_PROJECT } from "../../page-fixtures.ts";

vi.mock("@/app/(workspace)/projects/actions.ts", () => ({
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
  getProject: vi.fn<typeof getProject>(),
}));
vi.mock("@/projects/store.ts", () => ({
  getProject: stores.getProject,
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
vi.mock("@/app/(workspace)/projects/[projectId]/(overview)/actions.ts", () => ({
  editMilestoneAction: vi.fn(),
  deleteMilestoneAction: vi.fn(),
  startConversationAction: vi.fn(),
}));
vi.mock("@/constructs/own-construct-choices.ts", () => ({
  ownConstructChoices: () => Promise.resolve([]),
}));
vi.mock(
  "@/activities/activity-choices.ts",
  () => import("../../../../activities/activity-choices-test-kit.ts"),
);

// The widest the page's column grows: from the xl breakpoint, the quest's
// conversation and its plan sit side by side.
const CONVERSATION_WIDTH = 1152;
const MAX_COMPACT_HEADER_HEIGHT = 72;

const PARAMS = Promise.resolve({ projectId: FOX_PROJECT.id });

async function renderProject(section = "conversation"): Promise<void> {
  const content = await ProjectPage({
    params: PARAMS,
    searchParams: Promise.resolve({ section }),
  });
  await render(
    inWorkspace(<ProjectLayout params={PARAMS}>{content}</ProjectLayout>),
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
  stores.getProject.mockResolvedValue(FOX_PROJECT);
});

afterEach(() => {
  vi.clearAllMocks();
});

test.each(["completed", "abandoned"] as const)(
  "a %s quest page keeps its Journal and conversation after its status changes",
  async (status) => {
    stores.getProject.mockResolvedValue({ ...FOX_PROJECT, status });
    await renderProject();
    await expect
      .element(page.getByRole("link", { name: MEMORY_COPY.link }))
      .toHaveAttribute("href", `/projects/${FOX_PROJECT.id}/memory`);
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
          <ProjectLayout params={PARAMS}>
            <ProjectLoading />
          </ProjectLayout>,
        ),
      );
      const busy = page.getByRole("status", { name: PROJECT_COPY.loading });
      expect(page.getByRole("status").all()).toHaveLength(1);
      await expect.element(busy).toHaveAttribute("aria-busy", "true");
      await expect.element(page.getByRole("link")).not.toBeInTheDocument();
      await expect.element(page.getByRole("listitem")).not.toBeInTheDocument();
      const frame = busy.element().parentElement;
      const before = frame?.getBoundingClientRect();
      const loadingWorkspace = busy
        .element()
        .firstElementChild?.getBoundingClientRect();
      expect(before?.width).toBeLessThanOrEqual(CONVERSATION_WIDTH);
      if (!populated) {
        stores.readQuestConversation.mockResolvedValue(undefined);
      }
      const content = await ProjectPage({
        params: PARAMS,
        searchParams: Promise.resolve({}),
      });
      await screen.rerender(
        inWorkspace(<ProjectLayout params={PARAMS}>{content}</ProjectLayout>),
      );
      // Infrequent quest actions stay in a disclosure beside the sections.
      const menu = page.getByRole("button", { name: "Quest actions" });
      await expect.element(menu).toBeVisible();
      const title = menu.element().getBoundingClientRect();
      const workspace = page
        .getByRole("navigation", { name: PROJECT_COPY.navigation })
        .element()
        .closest("header")?.parentElement;
      expect(
        workspace?.querySelector("header")?.getBoundingClientRect().height,
      ).toBeLessThanOrEqual(MAX_COMPACT_HEADER_HEIGHT);
      expect(workspace?.getBoundingClientRect()).toMatchObject({
        x: loadingWorkspace?.x,
        width: loadingWorkspace?.width,
      });
      expect(title.left).toBeGreaterThan(0);
      expect(title.right).toBeLessThan(viewport.width);
      expect(frame?.getBoundingClientRect()).toMatchObject({
        x: before?.x,
        width: before?.width,
      });
      await expect
        .element(page.getByRole("status", { name: PROJECT_COPY.loading }))
        .not.toBeInTheDocument();
      let result = page.getByText(QUEST_CONVERSATION_COPY.notStarted);
      if (populated) {
        result = composer();
      }
      await expect.element(result).toBeVisible();
      const retry = vi.fn<() => void>();
      await screen.rerender(
        inWorkspace(
          <ProjectLayout params={PARAMS}>
            <ProjectError
              error={new Error("Private quest detail")}
              retry={retry}
            />
          </ProjectLayout>,
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
        .element(page.getByRole("link", { name: PROBLEMS_COPY.projectsLink }))
        .toBeVisible();
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
        viewport.width,
      );
      await setViewport(LAPTOP_VIEWPORT);
    },
  );
});

test("the workspace keeps navigation and direct status actions compact", async () => {
  await setViewport(LAPTOP_VIEWPORT);
  await renderProject();
  expect(
    page.getByRole("heading", { level: 1 }).query(),
    "the quest's name is the trail band's heading, not the frame's",
  ).toBeNull();
  const navigation = page.getByRole("navigation", {
    name: PROJECT_COPY.navigation,
  });
  await expect
    .element(
      navigation.getByRole("link", { name: WORKSPACES_COPY.conversation }),
    )
    .toHaveAttribute("aria-current", "page");
  await expect
    .element(navigation.getByRole("link", { name: MEMORY_COPY.link }))
    .toHaveAttribute("href", `/projects/${FOX_PROJECT.id}/memory`);
  const portrait = navigation.getByRole("button", {
    name: CONSTRUCT_DISCOVERY_COPY.openProfile(FOX_CONVERSATION.construct.name),
  });
  await expect.element(portrait).toBeVisible();
  await expect
    .element(
      navigation.getByText(FOX_CONVERSATION.construct.name, { exact: true }),
    )
    .not.toBeInTheDocument();
  const conversationTab = navigation.getByRole("link", {
    name: WORKSPACES_COPY.conversation,
  });
  expect(portrait.element().getBoundingClientRect().right).toBeLessThanOrEqual(
    conversationTab.element().getBoundingClientRect().left,
  );
  await portrait.click();
  await expect.element(page.getByRole("dialog")).toBeVisible();
  await expect
    .element(
      page.getByRole("heading", { name: FOX_CONVERSATION.construct.name }),
    )
    .toBeVisible();
  await page
    .getByRole("button", { name: CONSTRUCT_DISCOVERY_COPY.closeProfile })
    .click();
  await expect.element(portrait).toHaveFocus();
  const menu = page.getByRole("button", { name: "Quest actions" });
  await expect.element(menu).toBeVisible();
  await expect
    .element(page.getByRole("button", { name: "Finish Quest", exact: true }))
    .not.toBeInTheDocument();
  await expect
    .element(page.getByText("Active", { exact: true }))
    .not.toBeInTheDocument();
  const header = navigation
    .element()
    .closest("header")
    ?.getBoundingClientRect();
  expect(header?.height).toBeLessThanOrEqual(MAX_COMPACT_HEADER_HEIGHT);
  await menu.click();
  await expect
    .element(page.getByRole("button", { name: "Finish Quest", exact: true }))
    .toBeVisible();
  await expect
    .element(page.getByRole("button", { name: "Abandon Quest", exact: true }))
    .toBeVisible();
});
