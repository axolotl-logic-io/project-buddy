// Spell conversation replies and the pinned trail in the quest workspace.
import type { UIMessageChunk } from "ai";
import type { JSX } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import HeaderLinks from "@/app/@header/[...path]/page.tsx";
import QuestPage from "@/app/(workspace)/quests/[questId]/(overview)/page.tsx";
import type { ChatMessage } from "@/chats/message-author.ts";
import type { listMessages, readStoppedReply } from "@/chats/store.ts";
import { findConversation } from "@/conversations/conversation-store.ts";
import type { readQuestConversation } from "@/conversations/start-quest.ts";
import type { getQuest } from "@/quests/store.ts";
import { getSpell } from "@/spells/spell.ts";
import { DEFAULT_THEME_ATTRIBUTES } from "@/themes/theme-choice.ts";
import { CAST_SPELL_COPY, CHAT_COPY } from "@/ui/copy/chat.ts";
import { QUESTS_COPY } from "@/ui/copy/quests.ts";
import { SITE_COPY } from "@/ui/copy/site.ts";
import { TIMER_COPY } from "@/ui/copy/timer.ts";
import {
  SIGNED_IN_USER,
  signInAs,
} from "../../../../auth/current-user-test-kit.ts";
import {
  answerChat,
  holdBeforeChunk,
} from "../../../../components/chat-stream-test-kit.ts";
import { markdownReplyText } from "../../../../replies/rich-message-test-kit.ts";
import {
  LAPTOP_VIEWPORT,
  NARROWEST_VIEWPORT,
  PHONE_VIEWPORT,
} from "../../../../viewports-test-kit.ts";
import { inWorkspace } from "../../../workspace-test-kit.tsx";
import { FOX_CONVERSATION, FOX_QUEST } from "../../page-fixtures.ts";

vi.mock("@/ideas/idea-store.ts", () => ({
  listIdeas: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/app/(workspace)/quests/actions.ts", () => ({
  startQuestAction: (): never => {
    throw new Error("Quest creation is not available in a quest conversation");
  },
}));

vi.mock(
  "@/tasks/tasks-actions.ts",
  () => import("../../../../tasks/tasks-actions-test-kit.ts"),
);
vi.mock(
  "@/tasks/tasks-store.ts",
  () => import("../../../../tasks/tasks-store-test-kit.ts"),
);

vi.mock(
  "@/auth/current-user.ts",
  () => import("../../../../auth/current-user-test-kit.ts"),
);

const store = vi.hoisted(() => ({
  listMessages: vi.fn<typeof listMessages>(),
  readStoppedReply: vi.fn<typeof readStoppedReply>(),
  readQuestConversation: vi.fn<typeof readQuestConversation>(),
  getQuest: vi.fn<typeof getQuest>(),
}));
vi.mock("@/chats/store.ts", () => ({
  getChat: vi.fn(),
  listMessages: store.listMessages,
  readStoppedReply: store.readStoppedReply,
}));
vi.mock("@/conversations/start-quest.ts", () => ({
  readQuestConversation: store.readQuestConversation,
  startQuestConversation: vi.fn(),
}));
vi.mock("@/app/(workspace)/quests/[questId]/(overview)/actions.ts", () => ({
  startConversationAction: vi.fn(),
}));
vi.mock("@/milestones/milestone-store.ts", () => ({
  listMilestones: vi.fn().mockResolvedValue([]),
}));
vi.mock(
  "@/dailies/day-store.ts",
  () => import("../../../../dailies/day-store-test-kit.ts"),
);

vi.mock("@/quests/store.ts", () => ({ getQuest: store.getQuest }));
// The header's ring of the user's circle reads their experience, server code.
vi.mock(
  "@/experience/experience-store.ts",
  () => import("../../../../experience/experience-store-test-kit.ts"),
);
vi.mock("@/retirement/retirement-store.ts", () => ({
  listRetiredDefinitions: vi.fn().mockResolvedValue([]),
  getRetiredDefinition: vi.fn(),
}));

// ChatView refreshes the page through the App Router.
vi.mock(
  "next/navigation",
  () => import("../../../../components/router-test-kit.ts"),
);

// The header's widest gutter, in CSS px: the trail band's right padding.

// The screens the case is checked on, a laptop's and a phone's, and the
// most the trail band and the conversation's pinned header may take of
// each together, in CSS px.
const SCREENS = [
  { viewport: LAPTOP_VIEWPORT, pinnedBudget: 140 },
  { viewport: PHONE_VIEWPORT, pinnedBudget: 112 },
] as const;
// A quest's name that takes the band's heading to two lines on a phone.
const LONG_QUEST_NAME = "One layer up: interface, associativity explorer";
// The Python block that ends each reply, shown once the reply is laid out.
const REPLY_END = "bpy.ops.mesh.bevel(offset=0.1)";
// Three replies fill a laptop's screen several times over.
const EXCHANGES = 3;

// The user’s question and the construct's Markdown reply, EXCHANGES times.
function longChat(): ChatMessage[] {
  return Array.from({ length: EXCHANGES }, (_, index): ChatMessage[] => [
    {
      id: `m${index}`,
      role: "user",
      parts: [{ type: "text", text: "Show the saved example" }],
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

beforeEach(() => {
  for (const [name, value] of Object.entries(DEFAULT_THEME_ATTRIBUTES)) {
    document.documentElement.setAttribute(name, value);
  }
  document.documentElement.classList.add("h-full");
  document.body.classList.add("flex", "min-h-full", "flex-col");
  signInAs(SIGNED_IN_USER);
  store.getQuest.mockResolvedValue(FOX_QUEST);
  store.readQuestConversation.mockResolvedValue(FOX_CONVERSATION);
  vi.mocked(findConversation).mockResolvedValue({
    ...FOX_CONVERSATION,
    spellStartedAt: "2026-11-18T12:00:00Z",
    activeSpell: getSpell("brainstorm"),
  });
  store.listMessages.mockResolvedValue(longChat());
});

afterEach(() => {
  window.scrollTo(0, 0);
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("use_case_breadcrumbs_in_long_chat", () => {
  for (const { viewport, pinnedBudget } of SCREENS) {
    for (const name of [FOX_QUEST.name, LONG_QUEST_NAME]) {
      test(`${viewport.width} px wide, for ${name}`, async () => {
        store.getQuest.mockResolvedValue({ ...FOX_QUEST, name });
        await page.viewport(viewport.width, viewport.height);
        await render(await chatPage());
        const backLink = page
          .getByRole("navigation", { name: SITE_COPY.breadcrumbs })
          .getByRole("link", { name: QUESTS_COPY.heading, exact: true });
        const conversation = page.getByRole("list", {
          name: CHAT_COPY.conversationLabel,
        });
        await expect
          .poll(() => conversation.element().textContent)
          .toContain(REPLY_END);

        await expect
          .element(
            page.getByRole("combobox", { name: "Activity", exact: true }),
          )
          .not.toBeInTheDocument();

        await scrollToBottom();
        const trail = page.getByRole("navigation", {
          name: SITE_COPY.breadcrumbs,
        });
        await expect.element(trail).toBeInViewport({ ratio: 1 });
        const shared = trail.element().closest("header");
        expect(shared).not.toBeNull();
        const heading = page.getByRole("heading", { level: 1 });
        await expect.element(heading).toHaveTextContent(name);
        await expect.element(heading).toBeInViewport({ ratio: 1 });
        expect(heading.element().closest("header")).toBe(shared);
        expect(
          (shared?.getBoundingClientRect().bottom ?? Number.POSITIVE_INFINITY) -
            Math.max(0, shared?.getBoundingClientRect().top ?? 0),
          "the trail band stays within the pinned budget",
        ).toBeLessThanOrEqual(pinnedBudget);
        // Each wholly on screen, and in reach.
        const targets = [
          backLink,
          page.getByRole("textbox", { name: CHAT_COPY.messageLabel }),
        ];
        await Promise.all(
          targets.map((target) =>
            expect.element(target).toBeInViewport({ ratio: 1 }),
          ),
        );
        expect(
          targets.map((target) => topmostAtCentre(target.element())),
        ).toEqual([true, true]);

        const first = conversation.element().firstElementChild;
        if (first === null) {
          throw new Error("The conversation is empty");
        }
        first.scrollIntoView({ block: "start" });
        expect(first.getBoundingClientRect().top).toBeGreaterThanOrEqual(
          shared?.getBoundingClientRect().bottom ?? Number.POSITIVE_INFINITY,
        );

        expect(backLink.element()).toHaveAttribute("href", "/quests");
      });
    }
  }
});

describe("the pinned quest title", () => {
  test("stays on screen while scrolling the spell transcript and leaves its messages reachable", async () => {
    await page.viewport(LAPTOP_VIEWPORT.width, LAPTOP_VIEWPORT.height);
    await render(await chatPage());
    const title = page.getByRole("heading", { level: 1 });
    const conversation = page.getByRole("list", {
      name: CHAT_COPY.conversationLabel,
    });
    await expect
      .poll(() => conversation.element().textContent)
      .toContain(REPLY_END);

    await scrollToBottom();
    await expect.element(title).toBeInViewport();
    const transcript = conversation.element();
    expect(transcript.scrollHeight).toBeGreaterThan(transcript.clientHeight);
    transcript.scrollTop = 0;
    const message = conversation
      .getByText("Show the saved example", { exact: true })
      .last()
      .element();
    message.scrollIntoView({ block: "center" });
    expect(transcript.scrollTop).toBeGreaterThan(0);
    await expect.element(title).toBeInViewport();
    expect(topmostAtCentre(message), "a tap reaches the message").toBe(true);
  });
});

describe("sidebar breadcrumb alignment", () => {
  test.each([FOX_QUEST.name, LONG_QUEST_NAME])(
    "opens from the breadcrumb row and follows it while pinned for %s",
    async (name) => {
      await page.viewport(LAPTOP_VIEWPORT.width, LAPTOP_VIEWPORT.height);
      store.getQuest.mockResolvedValue({ ...FOX_QUEST, name });
      await render(await chatPage());
      const row = page.getByRole("region", { name: SITE_COPY.breadcrumbs });
      const panel = page.getByRole("dialog", {
        name: TIMER_COPY.panel.label,
      });
      await expect.element(panel).toBeVisible();
      globalThis.scrollTo(0, 0);
      await expect.poll(() => globalThis.scrollY).toBe(0);
      await expect
        .poll(
          () =>
            panel.element().getBoundingClientRect().top -
            row.element().getBoundingClientRect().top -
            row.element().clientTop,
        )
        .toBeCloseTo(0, 0);
      expect(panel.element().getBoundingClientRect().right).toBe(
        LAPTOP_VIEWPORT.width,
      );
      expect(panel.element().getBoundingClientRect().bottom).toBe(
        LAPTOP_VIEWPORT.height,
      );
      await scrollToBottom();
      await expect
        .poll(
          () =>
            panel.element().getBoundingClientRect().top -
            row.element().getBoundingClientRect().top -
            row.element().clientTop,
        )
        .toBeCloseTo(0, 0);
      expect(panel.element().getBoundingClientRect().bottom).toBe(
        LAPTOP_VIEWPORT.height,
      );
      await page
        .getByRole("button", { name: TIMER_COPY.panel.collapse })
        .click();
      const toggle = page.getByRole("button", {
        name: TIMER_COPY.panel.expand,
      });
      await expect.element(toggle).toBeInViewport({ ratio: 1 });
      globalThis.scrollTo(0, 0);
      await expect
        .poll(
          () =>
            toggle.element().getBoundingClientRect().top -
            row.element().getBoundingClientRect().top,
        )
        .toBeGreaterThanOrEqual(0);
      const toggleBounds = toggle.element().getBoundingClientRect();
      await toggle.click();
      const closeBounds = page
        .getByRole("button", { name: TIMER_COPY.panel.collapse })
        .element()
        .getBoundingClientRect();
      expect([closeBounds.left, closeBounds.top]).toEqual([
        toggleBounds.left,
        toggleBounds.top,
      ]);
    },
  );
});

async function chatPage(): Promise<JSX.Element> {
  const content = await QuestPage({
    params: Promise.resolve({ questId: FOX_QUEST.id }),
    searchParams: Promise.resolve({}),
  });
  return (
    <>
      {
        await HeaderLinks({
          params: Promise.resolve({ path: ["quests", FOX_QUEST.id] }),
          searchParams: Promise.resolve({}),
        })
      }
      {inWorkspace(content)}
    </>
  );
}

describe("use_case_send_message", () => {
  test("streams and reopens in the quest's conversation with spell casts", async () => {
    await page.viewport(NARROWEST_VIEWPORT.width, NARROWEST_VIEWPORT.height);
    store.listMessages.mockResolvedValue([]);
    const chunks: UIMessageChunk[] = [
      { type: "start", messageId: "reply" },
      { type: "start-step" },
      {
        type: "tool-input-available",
        toolCallId: "spell",
        toolName: "cast_spell",
        input: { spellId: "brainstorm" },
      },
      {
        type: "tool-output-available",
        toolCallId: "spell",
        output: {
          status: "cast",
          spellId: "brainstorm",
          name: "Brainstorm",
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
      .element(
        page.getByText(CAST_SPELL_COPY.cast("Brainstorm"), { exact: true }),
      )
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
    await page.getByRole("button", { name: TIMER_COPY.panel.expand }).click();
    await expect
      .element(
        page
          .getByRole("dialog", { name: TIMER_COPY.panel.label })
          .getByLabelText(TIMER_COPY.workLabel),
      )
      .toBeVisible();
    await page.getByRole("button", { name: TIMER_COPY.panel.collapse }).click();
    await expect.element(box).toHaveValue("Which idea should I try first?");
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
            type: "tool-cast_spell",
            toolCallId: "spell",
            state: "output-available",
            input: { spellId: "brainstorm" },
            output: {
              status: "cast",
              spellId: "brainstorm",
              name: "Brainstorm",
            },
          },
          { type: "text", text: "Let's explore your ideas." },
        ],
      },
    ];
    store.listMessages.mockResolvedValue(saved);
    await screen.rerender(await chatPage());
    await expect
      .element(
        page.getByText(CAST_SPELL_COPY.cast("Brainstorm"), { exact: true }),
      )
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
