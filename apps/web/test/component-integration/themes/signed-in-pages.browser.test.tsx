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
import ProjectLayout from "@/app/(workspace)/projects/[projectId]/(overview)/layout.tsx";
import ProjectPage from "@/app/(workspace)/projects/[projectId]/(overview)/page.tsx";
import MemoryPage from "@/app/(workspace)/projects/[projectId]/memory/page.tsx";
import type { ChatMessage } from "@/chats/message-author.ts";
import type { getChat, listMessages } from "@/chats/store.ts";
import type { readQuestConversation } from "@/conversations/start-quest.ts";
import { MEMORY_VERSION_NUMBER } from "@/memory/memory.ts";
import type { readMemoryHistory } from "@/memory/memory-store.ts";
import type { listMilestones } from "@/milestones/milestone-store.ts";
import type { getProject, listProjects } from "@/projects/store.ts";
import { THEMES } from "@/themes/themes.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";
import { PROJECT_COPY } from "@/ui/copy/projects.ts";
import { WORKSPACES_COPY } from "@/ui/copy/workspaces.ts";
import {
  FOX_CONVERSATION,
  FOX_PROJECT,
} from "../app/(workspace)/page-fixtures.ts";
import { siteHeaderAt } from "../app/site-header-test-kit.tsx";
import { inWorkspace } from "../app/workspace-test-kit.tsx";
import { SIGNED_IN_USER, signInAs } from "../auth/current-user-test-kit.ts";
import { loadCodeHighlighting } from "../components/code-highlighting-test-kit.ts";
import { markdownReplyText } from "../replies/mock-markdown-test-kit.ts";
import { LAPTOP_VIEWPORT } from "../viewports-test-kit.ts";
import {
  type CheckboxLook,
  checkboxLook,
  fontSize,
} from "./signed-in-pages-test-kit.ts";
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
  projects: {
    getProject: vi.fn<typeof getProject>(),
    listProjects: vi.fn<typeof listProjects>(),
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
  memory: { readMemoryHistory: vi.fn<typeof readMemoryHistory>() },
  milestones: {
    listMilestones: vi.fn<typeof listMilestones>(() => Promise.resolve([])),
  },
}));
vi.mock("@/projects/store.ts", () => stores.projects);
vi.mock("@/chats/store.ts", () => stores.chats);
vi.mock("@/conversations/start-quest.ts", () => stores.conversations);
vi.mock("@/memory/memory-store.ts", () => stores.memory);
vi.mock("@/milestones/milestone-store.ts", () => stores.milestones);
vi.mock("@/plan/plan-store.ts", () => import("../plan/plan-store-test-kit.ts"));
vi.mock("@/app/(workspace)/projects/[projectId]/(overview)/actions.ts", () => ({
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
vi.mock("@/app/(workspace)/projects/[projectId]/memory/actions.ts", () => ({
  saveMemoryAction: vi.fn(),
  restoreMemoryAction: vi.fn(),
}));

// A long project name, which the trail band's heading wraps.
const LONG_NAME = "Hangar door panel with hazard stripe rim and rivets";
const QUEST_PATH = ["projects", FOX_PROJECT.id] as const;
const JOURNAL_PATH = [...QUEST_PATH, "memory"] as const;

// A milestone list in the memory: one milestone done, one to do.
const MILESTONES =
  "## Milestones\n\n- [x] Block out the panel\n- [ ] Bevel the rim";

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

// Renders the page of a project named name, in its layout.
async function renderProject(name: string): Promise<void> {
  stores.projects.getProject.mockResolvedValue({ ...FOX_PROJECT, name });
  stores.projects.listProjects.mockResolvedValue([{ ...FOX_PROJECT, name }]);
  const params = Promise.resolve({ projectId: FOX_PROJECT.id });
  const content = await ProjectPage({
    params,
    searchParams: Promise.resolve({}),
  });
  await render(
    <>
      {await siteHeaderAt(QUEST_PATH)}
      {inWorkspace(<ProjectLayout params={params}>{content}</ProjectLayout>)}
    </>,
  );
}

// Renders the memory page of a project whose memory is MILESTONES.
async function renderMilestones(): Promise<void> {
  stores.projects.getProject.mockResolvedValue(FOX_PROJECT);
  stores.memory.readMemoryHistory.mockResolvedValue([
    {
      version: MEMORY_VERSION_NUMBER.parse(1),
      text: MILESTONES,
      author: "user",
      savedBy: undefined,
      createdAt: new Date("2026-10-11T09:00:00Z"),
    },
  ]);
  const content = await MemoryPage({
    params: Promise.resolve({ projectId: FOX_PROJECT.id }),
    searchParams: Promise.resolve({}),
  });
  await render(
    <>
      {await siteHeaderAt(JOURNAL_PATH)}
      {inWorkspace(content)}
    </>,
  );
}

// Renders a quest whose conversation's reply is the mock construct's
// Markdown.
async function renderMarkdownChat(): Promise<void> {
  stores.projects.getProject.mockResolvedValue(FOX_PROJECT);
  stores.chats.listMessages.mockResolvedValue(markdownExchange());
  const content = await ProjectPage({
    params: Promise.resolve({ projectId: FOX_PROJECT.id }),
    searchParams: Promise.resolve({}),
  });
  await render(
    <>
      {await siteHeaderAt(QUEST_PATH)}
      {inWorkspace(content)}
    </>,
  );
}

// Opens the page of a project with a long name and returns whether its
// Journal link is below the name, the page's heading.
async function journalBelowLongName(): Promise<boolean> {
  await renderProject(LONG_NAME);
  await loadFonts();
  // The quest opens on its latest message; the frame is at the page's top.
  window.scrollTo(0, 0);
  const heading = page.getByRole("heading", { level: 1, name: LONG_NAME });
  const link = page.getByRole("link", { name: MEMORY_COPY.link });
  return (
    link.element().getBoundingClientRect().top >=
    heading.element().getBoundingClientRect().bottom
  );
}

// A milestone checkbox as the memory shows it.
interface MilestoneBox {
  readonly checked: boolean;
  readonly disabled: boolean;
  readonly look: CheckboxLook;
}

// The checkboxes of the current memory, when it is MILESTONES.
async function milestoneBoxes(): Promise<readonly MilestoneBox[]> {
  await renderMilestones();
  return page
    .getByRole("region", { name: MEMORY_COPY.currentLabel })
    .getByRole("checkbox")
    .elements()
    .filter((box) => box instanceof HTMLInputElement)
    .map((box) => ({
      checked: box.checked,
      disabled: box.disabled,
      look: checkboxLook(box),
    }));
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

      test("a long quest title keeps Journal navigation below it at 1280 px", async () => {
        expect(await journalBelowLongName()).toBe(true);
      });

      test("the memory's milestones show read-only checkboxes in the theme's colours", async () => {
        const [done, toDo, ...others] = await milestoneBoxes();

        expect(others).toEqual([]);
        expect([done?.checked, done?.disabled]).toEqual([true, true]);
        expect([toDo?.checked, toDo?.disabled]).toEqual([false, true]);
        expect(done?.look.appearance).toBe("none");
        expect([done?.look.background, done?.look.border]).toEqual([
          done?.look.primary,
          done?.look.primary,
        ]);
        expect([toDo?.look.background, toDo?.look.border]).toEqual([
          toDo?.look.field,
          toDo?.look.line,
        ]);
      });

      test("a heading in a reply stays smaller than the page's heading", async () => {
        const sizes = await headingSizes();

        expect(sizes.reply).toBeLessThan(sizes.page);
      });
    });
  }
});

test("the Journal selects its workspace link and leads back to its quest", async () => {
  await renderMilestones();
  await expect
    .element(page.getByRole("heading", { level: 1 }))
    .toHaveTextContent(MEMORY_COPY.heading);
  await expect
    .element(page.getByRole("link", { name: FOX_PROJECT.name }))
    .toHaveAttribute("href", `/projects/${FOX_PROJECT.id}`);
  const nav = page.getByRole("navigation", { name: PROJECT_COPY.navigation });
  await expect
    .element(nav.getByRole("link", { name: MEMORY_COPY.link }))
    .toHaveAttribute("aria-current", "page");
  await expect
    .element(nav.getByRole("link", { name: WORKSPACES_COPY.conversation }))
    .toHaveAttribute("href", `/projects/${FOX_PROJECT.id}`);
});
