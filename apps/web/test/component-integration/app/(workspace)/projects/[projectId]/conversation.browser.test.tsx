// A quest's page opens on its one conversation, in Chromium and WebKit.
// "use_case_open_project": the conversation and its composer come first,
// with the quest's sections a tap away, and no adventure list or New
// adventure button. "use_case_breadcrumbs_in_long_chat" in
// use-cases/chats.md: a conversation longer than the screen, scrolled to its
// end. The way back to the quests, the conversation's pinned header and the
// composer stay wholly on screen and in reach, on a laptop and on a phone,
// and a jump to a message lands below the pinned header. The page sits in
// the main landmark and the workspace's column, as the layouts render it;
// the site's stylesheet comes from vitest.browser-setup.ts.
// "use_case_hide_extras" in use-cases/appearance.md: the pinned header,
// switched off, scrolls away and draws nothing over the conversation.
// "use_case_send_message": a reply streams in the quest's conversation.
// "use_case_dailies": Start the day sends its prepared message like any
// other, keeping the draft. "use_case_start_quest_conversation": a quest
// without a conversation offers to start it, and reading it starts nothing.
import type { UIMessageChunk } from "ai";
import type { JSX } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import HeaderLinks from "@/app/@header/[...path]/page.tsx";
import ProjectPage from "@/app/(workspace)/projects/[projectId]/(overview)/page.tsx";
import type { ChatMessage } from "@/chats/message-author.ts";
import type {
  listMessages,
  markChatRead,
  readStoppedReply,
} from "@/chats/store.ts";
import { SiteHeader } from "@/components/site-header.tsx";
import type { readQuestConversation } from "@/conversations/start-quest.ts";
import {
  applyHiddenFlags,
  DEFAULT_FLAG_ATTRIBUTES,
} from "@/flags/flag-choice.ts";
import { DEFAULT_HIDDEN_FLAGS } from "@/flags/flags.ts";
import type { getProject } from "@/projects/store.ts";
import { DEFAULT_THEME_ATTRIBUTES } from "@/themes/theme-choice.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import { CONSTRUCT_DISCOVERY_COPY } from "@/ui/copy/construct-discovery.ts";
import { QUEST_CONVERSATION_COPY } from "@/ui/copy/conversation.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";
import { PROGRESS_TIMELINE_COPY } from "@/ui/copy/milestones.ts";
import { PROJECT_NOTES_COPY } from "@/ui/copy/notes.ts";
import { PLAN_COPY } from "@/ui/copy/plan.ts";
import { PROJECT_COPY, PROJECTS_COPY } from "@/ui/copy/projects.ts";
import { WORKSPACES_COPY } from "@/ui/copy/workspaces.ts";
import {
  SIGNED_IN_USER,
  signInAs,
} from "../../../../auth/current-user-test-kit.ts";
import {
  answerChat,
  holdBeforeChunk,
} from "../../../../components/chat-stream-test-kit.ts";
import { markdownReplyText } from "../../../../replies/mock-markdown-test-kit.ts";
import {
  LAPTOP_VIEWPORT,
  NARROWEST_VIEWPORT,
  PHONE_VIEWPORT,
} from "../../../../viewports-test-kit.ts";
import { inWorkspace } from "../../../workspace-test-kit.tsx";
import { FOX_CHAT, FOX_PROJECT } from "../../page-fixtures.ts";

vi.mock(
  "@/plan/plan-actions.ts",
  () => import("../../../../plan/plan-actions-test-kit.ts"),
);
vi.mock(
  "@/plan/plan-store.ts",
  () => import("../../../../plan/plan-store-test-kit.ts"),
);
vi.mock("@/gold/gold-store.ts", () => ({
  readGoldBalance: vi.fn().mockResolvedValue(0),
}));

vi.mock(
  "@/auth/current-user.ts",
  () => import("../../../../auth/current-user-test-kit.ts"),
);

const store = vi.hoisted(() => ({
  listMessages: vi.fn<typeof listMessages>(),
  markChatRead: vi.fn<typeof markChatRead>(),
  readStoppedReply: vi.fn<typeof readStoppedReply>(),
  readQuestConversation: vi.fn<typeof readQuestConversation>(),
  getProject: vi.fn<typeof getProject>(),
}));
vi.mock("@/chats/store.ts", () => ({
  getChat: vi.fn(),
  listMessages: store.listMessages,
  markChatRead: store.markChatRead,
  readStoppedReply: store.readStoppedReply,
}));
vi.mock("@/conversations/start-quest.ts", () => ({
  readQuestConversation: store.readQuestConversation,
  startQuestConversation: vi.fn(),
}));
vi.mock("@/app/(workspace)/projects/[projectId]/(overview)/actions.ts", () => ({
  startConversationAction: vi.fn(),
  inviteToProjectAction: vi.fn(),
  revokeProjectInvitationAction: vi.fn(),
  saveCheckInSettingAction: vi.fn(),
  deleteNoteAction: vi.fn(),
  editMilestoneAction: vi.fn(),
  deleteMilestoneAction: vi.fn(),
  removeMemberAction: vi.fn(),
  leaveProjectAction: vi.fn(),
}));
vi.mock("@/app/(workspace)/projects/invitations/actions.ts", () => ({
  joinProjectAction: vi.fn(),
  declineProjectInvitationAction: vi.fn(),
}));
vi.mock("@/check-ins/check-in-store.ts", () => ({
  readCheckInFrequency: vi.fn(),
}));
vi.mock("@/milestones/milestone-store.ts", () => ({
  listMilestones: vi.fn(),
}));
vi.mock("@/notes/note-store.ts", () => ({ readRecentNotes: vi.fn() }));
vi.mock("@/projects/members-store.ts", () => ({
  listProjectMembers: vi.fn(),
}));

vi.mock("@/activities/activity-store.ts", () => ({ getOwnActivity: vi.fn() }));
vi.mock("@/constructs/construct-store.ts", () => ({
  getOwnConstruct: vi.fn(),
}));
vi.mock("@/spells/spell-store.ts", () => ({ getOwnSpell: vi.fn() }));
vi.mock("@/marketplace/listing-store.ts", () => ({ getListing: vi.fn() }));
vi.mock("@/projects/project-invitations.ts", () => ({
  readProjectInvitation: vi.fn(),
  listSentProjectInvitations: vi.fn(),
}));
vi.mock("@/projects/store.ts", () => ({ getProject: store.getProject }));
vi.mock("@/retirement/retirement-store.ts", () => ({
  getRetiredDefinition: vi.fn(),
}));

// ChatView refreshes the page through the App Router.
vi.mock(
  "next/navigation",
  () => import("../../../../components/router-test-kit.ts"),
);

const FOX_CONVERSATION = {
  ...FOX_CHAT,
  activity: {
    id: "open-chat",
    name: "Open adventure",
    definition: { prompt: "", openingRequest: "" },
  },
} as const;
// The screens the case is checked on: a laptop's and a phone's.
const VIEWPORTS = [LAPTOP_VIEWPORT, PHONE_VIEWPORT] as const;
// The Python block that ends each reply, shown once the reply is laid out.
const REPLY_END = "bpy.ops.mesh.bevel(offset=0.1)";
// Three replies fill a laptop's screen several times over.
const EXCHANGES = 3;
// The height of the band of the conversation one screen down that
// lineOneScreenDown finds, in CSS px: wider than the pinned header's fade.
const ONE_SCREEN_DOWN_BAND = 64;

// The user’s question and the mock construct's Markdown reply, EXCHANGES times.
function longChat(): ChatMessage[] {
  return Array.from({ length: EXCHANGES }, (_, index): ChatMessage[] => [
    {
      id: `m${index}`,
      role: "user",
      parts: [{ type: "text", text: "/mock-markdown" }],
    },
    {
      id: `r${index}`,
      role: "assistant",
      parts: [{ type: "text", text: markdownReplyText() }],
    },
  ]).flat();
}

// Scrolls the page to its end, again until it stays there, since a reply's
// code blocks may still grow once laid out.
async function scrollToBottom(): Promise<void> {
  await vi.waitFor((): void => {
    const { scrollHeight } = document.documentElement;
    window.scrollTo(0, scrollHeight);
    if (
      window.scrollY === 0 ||
      window.scrollY + window.innerHeight < scrollHeight - 1
    ) {
      throw new Error("The page is not scrolled to its end");
    }
  });
}

// Whether nothing is drawn over the centre of element, so a tap there
// reaches it.
function topmostAtCentre(element: Element): boolean {
  const box = element.getBoundingClientRect();
  const topmost = document.elementFromPoint(
    box.left + box.width / 2,
    box.top + box.height / 2,
  );
  return topmost !== null && element.contains(topmost);
}

// How far, in CSS px, lineOneScreenDown moves the page at a time when the
// part it finds starts too close to the top of the window.
const SCROLL_STEP = 32;
// How many steps it tries each way.
const SCROLL_TRIES = 8;
// The offsets from one screen down that it tries, in order: none, then a
// step down, a step up, two steps down, and so on.
const SCROLL_OFFSETS: readonly number[] = [
  0,
  ...Array.from(
    { length: SCROLL_TRIES },
    (_, index) => (index + 1) * SCROLL_STEP,
  ).flatMap((distance) => [distance, -distance]),
];
// The share of the window's height the pinned header and its fade take at
// most: a quarter.
const HEADER_SHARE = 4;

// The smallest part of the conversation drawn across the band around the
// window's middle, or undefined for none.
function smallestAcrossMiddle(conversation: Element): Element | undefined {
  const middle = window.innerHeight / 2;
  const [smallest] = [...conversation.querySelectorAll("*")]
    .filter((element) => {
      const { top, bottom } = element.getBoundingClientRect();
      return (
        top <= middle - ONE_SCREEN_DOWN_BAND / 2 &&
        bottom >= middle + ONE_SCREEN_DOWN_BAND / 2
      );
    })
    .toSorted(
      (one, other) =>
        one.getBoundingClientRect().height -
        other.getBoundingClientRect().height,
    );
  return smallest;
}

// Scrolls the page so that a point about one screen down from its top sits
// in the window's middle, below anything pinned at the top, and returns the
// smallest part of the conversation drawn across the band around that
// middle: where a header that has lost its pinned place would draw its fade
// into the conversation. The part must start below the top quarter of the
// window, where the pinned header and its fade are drawn; when the part
// found starts higher, such as a whole message around a gap between its
// paragraphs, the page moves a step at a time, each way, until one does.
function lineOneScreenDown(conversation: Element): Element {
  const clearOfHeader = window.innerHeight / HEADER_SHARE;
  for (const offset of SCROLL_OFFSETS) {
    window.scrollTo(0, window.innerHeight / 2 + offset);
    const smallest = smallestAcrossMiddle(conversation);
    if (
      smallest !== undefined &&
      smallest.getBoundingClientRect().top >= clearOfHeader
    ) {
      return smallest;
    }
  }
  throw new Error("Nothing of the conversation is one screen down");
}

beforeEach(() => {
  for (const [name, value] of Object.entries({
    ...DEFAULT_THEME_ATTRIBUTES,
    ...DEFAULT_FLAG_ATTRIBUTES,
  })) {
    document.documentElement.setAttribute(name, value);
  }
  document.documentElement.classList.add("h-full");
  document.body.classList.add("flex", "min-h-full", "flex-col");
  signInAs(SIGNED_IN_USER);
  store.getProject.mockResolvedValue(FOX_PROJECT);
  store.readQuestConversation.mockResolvedValue(FOX_CONVERSATION);
  store.listMessages.mockResolvedValue(longChat());
});

afterEach(() => {
  window.scrollTo(0, 0);
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("use_case_breadcrumbs_in_long_chat", () => {
  for (const viewport of VIEWPORTS) {
    test(`${viewport.width} px wide`, async () => {
      await page.viewport(viewport.width, viewport.height);
      await render(await chatPage());
      const backLink = page
        .getByRole("navigation", { name: "Breadcrumbs" })
        .getByRole("link", { name: PROJECTS_COPY.allProjectsLink });
      const pinned = page.getByRole("button", {
        name: CONSTRUCT_DISCOVERY_COPY.openProfile(FOX_CHAT.construct.name),
      });
      const conversation = page.getByRole("list", {
        name: CHAT_COPY.conversationLabel,
      });
      await expect
        .poll(() => conversation.element().textContent)
        .toContain(REPLY_END);

      await expect
        .element(page.getByRole("combobox", { name: "Activity", exact: true }))
        .not.toBeInTheDocument();

      await scrollToBottom();
      const trail = page.getByRole("navigation", { name: "Breadcrumbs" });
      await expect.element(trail).toBeInViewport({ ratio: 1 });
      const shared = trail.element().closest("header");
      const controls = pinned.element().closest("header");
      expect(shared).not.toBeNull();
      expect(controls).not.toBeNull();
      await expect
        .poll(() => controls?.getBoundingClientRect().top)
        .toBeCloseTo(shared?.getBoundingClientRect().bottom ?? -1, 0);
      // Each wholly on screen, and in reach.
      const targets = [
        backLink,
        pinned,
        page.getByRole("textbox", { name: CHAT_COPY.messageLabel }),
      ];
      await Promise.all(
        targets.map((target) =>
          expect.element(target).toBeInViewport({ ratio: 1 }),
        ),
      );
      expect(
        targets.map((target) => topmostAtCentre(target.element())),
      ).toEqual([true, true, true]);

      const first = conversation.element().firstElementChild;
      if (first === null) {
        throw new Error("The conversation is empty");
      }
      first.scrollIntoView({ block: "start" });
      expect(first.getBoundingClientRect().top).toBeGreaterThanOrEqual(
        controls?.getBoundingClientRect().bottom ?? Number.POSITIVE_INFINITY,
      );

      expect(backLink.element()).toHaveAttribute("href", "/projects");
    });
  }
});

describe("use_case_hide_extras", () => {
  test("the pinned chat header, switched off, scrolls away and leaves nothing behind", async () => {
    await page.viewport(LAPTOP_VIEWPORT.width, LAPTOP_VIEWPORT.height);
    await render(await chatPage());
    const title = page.getByRole("button", {
      name: CONSTRUCT_DISCOVERY_COPY.openProfile(FOX_CHAT.construct.name),
    });
    const conversation = page.getByRole("list", {
      name: CHAT_COPY.conversationLabel,
    });
    await expect
      .poll(() => conversation.element().textContent)
      .toContain(REPLY_END);

    applyHiddenFlags(["pinned-chat-header", ...DEFAULT_HIDDEN_FLAGS]);
    await scrollToBottom();
    await expect.element(title).not.toBeInViewport();
    const trail = page.getByRole("navigation", { name: "Breadcrumbs" });
    await expect.element(trail).toBeInViewport({ ratio: 1 });
    expect(
      topmostAtCentre(
        trail.getByRole("link", { name: PROJECTS_COPY.allProjectsLink }).element(),
      ),
    ).toBe(true);
    const line = lineOneScreenDown(conversation.element());
    expect(topmostAtCentre(line), "a tap one screen down reaches it").toBe(
      true,
    );

    applyHiddenFlags(DEFAULT_HIDDEN_FLAGS);
    await scrollToBottom();
    await expect.element(title).toBeInViewport();
    expect(lineOneScreenDown(conversation.element())).toBe(line);
    expect(topmostAtCentre(line), "a tap one screen down reaches it").toBe(
      true,
    );
  });
});

async function chatPage(): Promise<JSX.Element> {
  const content = await ProjectPage({
    params: Promise.resolve({ projectId: FOX_PROJECT.id }),
    searchParams: Promise.resolve({}),
  });
  return (
    <>
      <SiteHeader
        links={
          await HeaderLinks({
            params: Promise.resolve({ path: ["projects", FOX_PROJECT.id] }),
            searchParams: Promise.resolve({}),
          })
        }
      />
      {inWorkspace(content)}
    </>
  );
}

describe("use_case_send_message", () => {
  test("streams and reopens in the quest's conversation without activity controls", async () => {
    await page.viewport(NARROWEST_VIEWPORT.width, NARROWEST_VIEWPORT.height);
    store.listMessages.mockResolvedValue([]);
    const chunks: UIMessageChunk[] = [
      { type: "start", messageId: "reply" },
      { type: "start-step" },
      {
        type: "tool-input-available",
        toolCallId: "activity",
        toolName: "select_activity",
        input: { activityId: "brainstorming" },
      },
      {
        type: "tool-output-available",
        toolCallId: "activity",
        output: {
          status: "entered",
          activityId: "brainstorming",
          name: "Brainstorming",
          instructions: "Explore ideas",
        },
      },
      { type: "text-start", id: "text" },
      { type: "text-delta", id: "text", delta: "Let's explore your ideas." },
      { type: "text-end", id: "text" },
      { type: "finish-step" },
      { type: "finish" },
    ];
    const held = holdBeforeChunk(chunks, chunks.length - 1);
    answerChat(held.response);
    const screen = await render(await chatPage());
    const box = page.getByRole("textbox", { name: CHAT_COPY.messageLabel });
    const send = page.getByRole("button", {
      name: CHAT_COPY.send,
      exact: true,
    });
    await box.fill("Help me brainstorm");
    await send.click();
    await expect
      .element(page.getByText("Activity: Brainstorming", { exact: true }))
      .toBeVisible();
    await expect
      .element(page.getByText("Let's explore your ideas.", { exact: true }))
      .toBeVisible();
    await expect.element(send).not.toBeInTheDocument();
    await expect
      .element(page.getByRole("button", { name: CHAT_COPY.stop }))
      .toBeVisible();
    await expect.element(page.getByRole("combobox")).not.toBeInTheDocument();
    await expect
      .element(page.getByText("Activity", { exact: true }))
      .not.toBeInTheDocument();
    await box.fill("Which idea should I try first?");
    held.release();
    await expect.element(send).toBeEnabled();
    await expect.element(box).toHaveValue("Which idea should I try first?");
    const saved: ChatMessage[] = [
      {
        id: "question",
        role: "user",
        parts: [{ type: "text", text: "Help me brainstorm" }],
      },
      {
        id: "reply",
        role: "assistant",
        parts: [
          {
            type: "tool-select_activity",
            toolCallId: "activity",
            state: "output-available",
            input: { activityId: "brainstorming" },
            output: {
              status: "entered",
              activityId: "brainstorming",
              name: "Brainstorming",
              instructions: "Explore ideas",
            },
          },
          { type: "text", text: "Let's explore your ideas." },
        ],
      },
    ];
    store.listMessages.mockResolvedValue(saved);
    await screen.rerender(await chatPage());
    await expect
      .element(page.getByText("Activity: Brainstorming", { exact: true }))
      .toBeVisible();
    await expect
      .element(page.getByText("Let's explore your ideas.", { exact: true }))
      .toBeVisible();
    await expect.element(page.getByRole("combobox")).not.toBeInTheDocument();
    await expect.element(box).toBeEnabled();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      NARROWEST_VIEWPORT.width,
    );
  });
});

describe("use_case_open_project", () => {
  test("the quest opens on its conversation, with its sections a tap away", async () => {
    store.listMessages.mockResolvedValue([]);
    await render(await chatPage());

    await expect
      .element(page.getByRole("textbox", { name: CHAT_COPY.messageLabel }))
      .toBeVisible();
    const sections = page.getByRole("navigation", {
      name: PROJECT_COPY.navigation,
    });
    await expect
      .element(
        sections.getByRole("link", { name: WORKSPACES_COPY.conversation }),
      )
      .toHaveAttribute("aria-current", "page");
    await Promise.all(
      [
        MEMORY_COPY.link,
        PLAN_COPY.heading,
        PROGRESS_TIMELINE_COPY.heading,
        PROJECT_NOTES_COPY.heading,
      ].map((name) =>
        expect.element(sections.getByRole("link", { name })).toBeVisible(),
      ),
    );
    await expect
      .element(page.getByRole("heading", { name: "Adventures" }))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole("button", { name: "New adventure" }))
      .not.toBeInTheDocument();
    expect(store.markChatRead).not.toHaveBeenCalled();
  });

  test("an unread conversation is marked read for the viewer alone", async () => {
    store.readQuestConversation.mockResolvedValue({
      ...FOX_CONVERSATION,
      unread: true,
    });
    await render(await chatPage());

    expect(store.markChatRead).toHaveBeenCalledWith(
      SIGNED_IN_USER.id,
      FOX_CHAT.id,
    );
  });
});

describe("use_case_start_quest_conversation", () => {
  test("a quest with no conversation yet offers to start it, starting nothing on view", async () => {
    store.readQuestConversation.mockResolvedValue(undefined);
    await render(await chatPage());

    await expect
      .element(page.getByText(QUEST_CONVERSATION_COPY.notStarted))
      .toBeVisible();
    await expect
      .element(
        page.getByRole("button", { name: QUEST_CONVERSATION_COPY.start }),
      )
      .toBeEnabled();
    expect(store.listMessages).not.toHaveBeenCalled();
  });
});

describe("use_case_dailies", () => {
  test("Start the day sends its prepared message and keeps the draft", async () => {
    store.getProject.mockResolvedValue({ ...FOX_PROJECT, dailies: true });
    store.listMessages.mockResolvedValue([]);
    const held = holdBeforeChunk(
      [{ type: "start", messageId: "day-reply" }, { type: "finish" }],
      1,
    );
    const sent = answerChat(held.response);
    await render(await chatPage());
    const box = page.getByRole("textbox", { name: CHAT_COPY.messageLabel });
    await box.fill("A thought for later");
    await page
      .getByRole("button", { name: QUEST_CONVERSATION_COPY.startTheDay })
      .click();

    await expect
      .element(
        page.getByText(QUEST_CONVERSATION_COPY.startTheDayMessage, {
          exact: true,
        }),
      )
      .toBeVisible();
    await expect.element(box).toHaveValue("A thought for later");
    await expect.poll(() => sent.mock.calls.length).toBe(1);
    expect(String(sent.mock.calls[0]?.[1]?.body)).toContain(
      QUEST_CONVERSATION_COPY.startTheDayMessage,
    );
    held.release();
  });

  test("an ordinary quest offers no Start the day", async () => {
    store.listMessages.mockResolvedValue([]);
    await render(await chatPage());

    await expect
      .element(page.getByRole("textbox", { name: CHAT_COPY.messageLabel }))
      .toBeVisible();
    await expect
      .element(
        page.getByRole("button", { name: QUEST_CONVERSATION_COPY.startTheDay }),
      )
      .not.toBeInTheDocument();
  });
});
