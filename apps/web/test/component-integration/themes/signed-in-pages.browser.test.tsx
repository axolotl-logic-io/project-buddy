// "use_case_choose_theme", signed in, in Chromium and WebKit: each theme on
// the pages it styles beyond its colours. A long project name keeps the
// "Project memory" link beside it, the memory's checkboxes take the theme's
// colours, and a reply's heading stays smaller than the page's. Each page
// is rendered from fixed data, in its layouts, with the site's stylesheet
// (vitest.browser-setup.ts) and the theme's fonts (theme-fonts-test-kit.ts).
// test/app/layout-first-paint.test.tsx covers the theme's first paint,
// test/component-integration/components/appearance-choices.browser.test.tsx choosing it, and
// test/component-integration/components/focus.browser.test.tsx how each theme draws focus.
import type { UIMessage } from "ai";
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import ChatPage from "@/app/(workspace)/chats/[chatId]/page.tsx";
import ProjectLayout from "@/app/(workspace)/projects/[projectId]/(overview)/layout.tsx";
import ProjectPage from "@/app/(workspace)/projects/[projectId]/(overview)/page.tsx";
import MemoryPage from "@/app/(workspace)/projects/[projectId]/memory/page.tsx";
import type { getChat, listChats, listMessages } from "@/chats/store.ts";
import { DEFAULT_FLAG_ATTRIBUTES } from "@/flags/flag-choice.ts";
import { MEMORY_VERSION_NUMBER } from "@/memory/memory.ts";
import type { readMemoryHistory } from "@/memory/memory-store.ts";
import type { getProject, listProjects } from "@/projects/store.ts";
import { THEMES, type ThemeId } from "@/themes/themes.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";
import { FOX_CHAT, FOX_PROJECT } from "../app/(workspace)/page-fixtures.ts";
import { inWorkspace } from "../app/workspace-test-kit.tsx";
import { SIGNED_IN_USER, signInAs } from "../auth/current-user-test-kit.ts";
import { loadCodeHighlighting } from "../components/code-highlighting-test-kit.ts";
import { markdownReplyText } from "../replies/mock-markdown-test-kit.ts";
import { LAPTOP_VIEWPORT } from "../viewports-test-kit.ts";
import {
  type CheckboxLook,
  checkboxLook,
  fontSize,
  shareRow,
  verticalSpan,
} from "./signed-in-pages-test-kit.ts";
import { installThemeFonts, loadFonts } from "./theme-fonts-test-kit.ts";
import { applyTheme } from "./theme-test-kit.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../auth/current-user-test-kit.ts"),
);

const stores = vi.hoisted(() => ({
  projects: {
    getProject: vi.fn<typeof getProject>(),
    listProjects: vi.fn<typeof listProjects>(),
  },
  chats: {
    getChat: vi.fn<typeof getChat>(),
    listChats: vi.fn<typeof listChats>(),
    listMessages: vi.fn<typeof listMessages>(),
  },
  memory: { readMemoryHistory: vi.fn<typeof readMemoryHistory>() },
}));
vi.mock("@/projects/store.ts", () => stores.projects);
vi.mock("@/chats/store.ts", () => stores.chats);
vi.mock("@/memory/memory-store.ts", () => stores.memory);

// ChatView refreshes the page through the App Router.
vi.mock("next/navigation", () => import("../components/router-test-kit.ts"));

// The pages' forms post to Server Actions, which these tests never run.
vi.mock("@/app/(workspace)/chats/[chatId]/actions.ts", () => ({
  changeActivityAction: vi.fn(),
  renameChatAction: vi.fn(),
}));
vi.mock("@/app/(workspace)/chats/actions.ts", () => ({
  startChatAction: vi.fn(),
}));
vi.mock("@/buddies/own-buddy-choices.ts", () => ({
  ownBuddyChoices: () => Promise.resolve([]),
}));
vi.mock(
  "@/activities/activity-choices.ts",
  () => import("../activities/activity-choices-test-kit.ts"),
);
vi.mock(
  "@/activities/activity-sessions.ts",
  () => import("../activities/activity-sessions-test-kit.ts"),
);
vi.mock("@/app/(workspace)/projects/[projectId]/memory/actions.ts", () => ({
  saveMemoryAction: vi.fn(),
  restoreMemoryAction: vi.fn(),
}));

// The longest project name, in characters, that each theme keeps on one row
// with the "Project memory" link at 1280 px, in both browsers. A new theme
// needs its entry here (tsc fails until it's there).
const LONG_NAME_LENGTHS: Readonly<Record<ThemeId, number>> = {
  // Gravy Falls holds 38 characters beside the link; longer names wrap it
  // below (`theme-heading-sizes`).
  "gravy-falls": 38,
  "ghost-hasslers": 40,
  "ay-liens": 39,
};

// The words a long project name is cut from.
const LONG_NAME_SOURCE = "Hangar door panel with hazard stripe rim and rivets";

// A milestone list in the memory: one milestone done, one to do.
const MILESTONES =
  "## Milestones\n\n- [x] Block out the panel\n- [ ] Bevel the rim";

// Her question and the mock buddy's Markdown reply.
function markdownExchange(): UIMessage[] {
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
    inWorkspace(<ProjectLayout params={params}>{content}</ProjectLayout>),
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
      createdAt: new Date("2026-10-11T09:00:00Z"),
    },
  ]);
  const content = await MemoryPage({
    params: Promise.resolve({ projectId: FOX_PROJECT.id }),
    searchParams: Promise.resolve({}),
  });
  await render(inWorkspace(content));
}

// Renders a chat whose reply is the mock buddy's Markdown.
async function renderMarkdownChat(): Promise<void> {
  stores.chats.getChat.mockResolvedValue(FOX_CHAT);
  stores.chats.listMessages.mockResolvedValue(markdownExchange());
  const content = await ChatPage({
    params: Promise.resolve({ chatId: FOX_CHAT.id }),
    searchParams: Promise.resolve({}),
  });
  await render(inWorkspace(content));
}

// Opens the page of a project whose name is as long as theme keeps beside
// the "Project memory" link, and returns the name's length and whether the
// two share a row.
async function longNameRow(
  theme: ThemeId,
): Promise<{ length: number; sharesRow: boolean }> {
  const projectName = LONG_NAME_SOURCE.slice(0, LONG_NAME_LENGTHS[theme]);
  await renderProject(projectName);
  await loadFonts();
  const heading = page.getByRole("heading", { level: 1, name: projectName });
  const link = page.getByRole("link", { name: MEMORY_COPY.link });
  return {
    length: projectName.length,
    sharesRow: shareRow(
      verticalSpan(heading.element()),
      verticalSpan(link.element()),
    ),
  };
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
  for (const [name, value] of Object.entries(DEFAULT_FLAG_ATTRIBUTES)) {
    document.documentElement.setAttribute(name, value);
  }
  document.documentElement.classList.add("h-full");
  document.body.classList.add("flex", "min-h-full", "flex-col");
  signInAs(SIGNED_IN_USER);
  stores.chats.listChats.mockResolvedValue([FOX_CHAT]);
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

      test('a long project name keeps "Project memory" beside it at 1280 px', async () => {
        expect(await longNameRow(id)).toEqual({
          length: LONG_NAME_LENGTHS[id],
          sharesRow: true,
        });
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
