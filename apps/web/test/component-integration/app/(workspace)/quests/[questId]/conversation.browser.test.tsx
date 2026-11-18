import { IDEAS_COPY } from "@/ui/copy/ideas.ts";
import { PROGRESS_TIMELINE_COPY } from "@/ui/copy/milestones.ts";
import { QUEST_SIDEBAR_COPY } from "@/ui/copy/quest-sidebar.ts";
import { QUEST_STATUS_COPY } from "@/ui/copy/quest-status.ts";
// A quest's page opens on its one conversation, in Chromium and WebKit.
// "use_case_open_quest": the conversation and its composer come first,
// with the quest's sections a tap away, and no adventure list or New
// adventure button. "use_case_breadcrumbs_in_long_chat" in
// use-cases/chats.md: a conversation longer than the screen, scrolled to its
// end. The trail band, with the way back to the quests and the quest's
// name as the page's heading, and the
// composer stay wholly on screen and in reach, on a laptop and on a phone,
// within the pinned budget even for a name on two lines, and a jump to a
// message lands below the trail band. The page sits in
// the main landmark and the workspace's column, as the layouts render it;
// the site's stylesheet comes from vitest.browser-setup.ts.
// "use_case_send_message": a reply streams in the quest's conversation, and a
// panel command typed in the composer runs without the construct.
// "use_case_dailies": Start Day and its Undo send their commands to the
// conversation, and the construct's button shares the breadcrumb row
// with the panel controls. "conversation initialization fallback": a quest
// without a conversation offers to start it, and reading it starts nothing.

import type { UIMessageChunk } from "ai";
import type { JSX } from "react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  onTestFinished,
  test,
  vi,
} from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import HeaderLinks from "@/app/@header/[...path]/page.tsx";
import QuestPage from "@/app/(workspace)/quests/[questId]/(overview)/page.tsx";
import type { ChatMessage } from "@/chats/message-author.ts";
import type { listMessages, readStoppedReply } from "@/chats/store.ts";
import type { readQuestConversation } from "@/conversations/start-quest.ts";
import { todayHere } from "@/dailies/dailies.ts";
import type { getQuest } from "@/quests/store.ts";
import { DEFAULT_THEME_ATTRIBUTES } from "@/themes/theme-choice.ts";
import { CAST_SPELL_COPY, CHAT_COPY } from "@/ui/copy/chat.ts";
import { CONSTRUCT_DISCOVERY_COPY } from "@/ui/copy/construct-discovery.ts";
import { QUEST_CONVERSATION_COPY } from "@/ui/copy/conversation.ts";
import { DAY_GRID_COPY } from "@/ui/copy/dailies.ts";
import { QUESTS_COPY } from "@/ui/copy/quests.ts";
import { SITE_COPY } from "@/ui/copy/site.ts";
import { TASKS_COPY } from "@/ui/copy/tasks.ts";
import {
  SIGNED_IN_USER,
  signInAs,
} from "../../../../auth/current-user-test-kit.ts";
import {
  answerChat,
  holdBeforeChunk,
} from "../../../../components/chat-stream-test-kit.ts";
import {
  bucket,
  collectionTab,
  openAction,
  openBucket,
} from "../../../../components/quest-sidebar-test-kit.ts";
import {
  closePanel,
  openPanel,
  sitePanel,
} from "../../../../components/site-panel-test-kit.ts";
import { readDailiesRecord } from "../../../../dailies/day-store-test-kit.ts";
import { markdownReplyText } from "../../../../replies/rich-message-test-kit.ts";
import { runChatCommandAction } from "../../../../tasks/tasks-actions-test-kit.ts";
import { readTasksState } from "../../../../tasks/tasks-store-test-kit.ts";
import {
  LAPTOP_VIEWPORT,
  MINIMUM_TARGET_PX,
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
// How long ago the Dailies quest's last day started, in hours and then in
// milliseconds, with half an hour more so the minute the line counts from
// stays within the hour.
const HOURS_AGO = 5;
const HOUR_MS = 3_600_000;
const STARTED_MS_AGO: number = HOURS_AGO * HOUR_MS + HOUR_MS / 2;
// The Dailies quest's recurring task and its streak since the gap, and a
// one-off task.
const STRETCH = "Stretch";
const VET = "Book the vet";
const STRETCH_STREAK = 3;
// A quest's name that takes the band's heading to two lines on a phone.
const LONG_QUEST_NAME = "One layer up: interface, associativity explorer";
// The Python block that ends each reply, shown once the reply is laid out.
const REPLY_END = "bpy.ops.mesh.bevel(offset=0.1)";
// Three replies fill a laptop's screen several times over.
const EXCHANGES = 3;
// The height of the band of the conversation one screen down that
// lineOneScreenDown finds, in CSS px: wider than the pinned header's fade.
const ONE_SCREEN_DOWN_BAND = 64;

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

// The smallest text block whose centre is near the window's middle.
// Image fallback glyphs can remain in the DOM underneath a loaded portrait.
// A large parent may cross that band while its centre is behind the composer.
function smallestAcrossMiddle(conversation: Element): Element | undefined {
  const middle = window.innerHeight / 2;
  const [smallest] = [
    ...conversation.querySelectorAll(
      "p, li, pre, blockquote, h1, h2, h3, h4, h5, h6",
    ),
  ]
    .filter((element) => {
      const { top, bottom } = element.getBoundingClientRect();
      return (
        bottom > top &&
        (top + bottom) / 2 >= middle - ONE_SCREEN_DOWN_BAND / 2 &&
        (top + bottom) / 2 <= middle + ONE_SCREEN_DOWN_BAND / 2
      );
    })
    .toSorted(
      (one, other) =>
        one.getBoundingClientRect().height -
        other.getBoundingClientRect().height,
    );
  return smallest;
}

// Scrolls the page so a point about one screen into the conversation sits
// in the window's middle, below anything pinned at the top, and returns the
// smallest part of the conversation drawn across the band around that
// middle: where a header that has lost its pinned place would draw its fade
// into the conversation. The part must start below the top quarter of the
// window, where the pinned header and its fade are drawn; when the part
// found starts higher, such as a whole message around a gap between its
// paragraphs, the page moves a step at a time, each way, until one does.
function lineOneScreenDown(conversation: Element): Element {
  const clearOfHeader = window.innerHeight / HEADER_SHARE;
  // Journal sections can precede the messages. Measure from the conversation
  // so a large first message's centre does not land behind the composer.
  const conversationTop =
    conversation.getBoundingClientRect().top + window.scrollY;
  for (const offset of SCROLL_OFFSETS) {
    window.scrollTo(0, conversationTop + window.innerHeight / 2 + offset);
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
  for (const [name, value] of Object.entries(DEFAULT_THEME_ATTRIBUTES)) {
    document.documentElement.setAttribute(name, value);
  }
  document.documentElement.classList.add("h-full");
  document.body.classList.add("flex", "min-h-full", "flex-col");
  signInAs(SIGNED_IN_USER);
  store.getQuest.mockResolvedValue(FOX_QUEST);
  store.readQuestConversation.mockResolvedValue(FOX_CONVERSATION);
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
  test("stays on screen at the end and leaves a tap one screen down reaching the conversation", async () => {
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
    const line = lineOneScreenDown(conversation.element());
    expect(topmostAtCentre(line), "a tap one screen down reaches it").toBe(
      true,
    );
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
        name: QUEST_SIDEBAR_COPY.label,
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
        .getByRole("button", { name: QUEST_SIDEBAR_COPY.collapse })
        .click();
      const toggle = page.getByRole("button", {
        name: QUEST_SIDEBAR_COPY.expand,
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
        .getByRole("button", { name: QUEST_SIDEBAR_COPY.collapse })
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
    await page.getByRole("button", { name: QUEST_SIDEBAR_COPY.expand }).click();
    await openBucket(IDEAS_COPY.heading);
    await expect
      .element(collectionTab(QUEST_SIDEBAR_COPY.buckets))
      .toHaveAttribute("aria-selected", "true");
    await openBucket(TASKS_COPY.heading);
    await expect
      .element(
        page.getByRole("button", {
          name: TASKS_COPY.addPlaceholder,
          exact: true,
        }),
      )
      .toBeDisabled();
    await page
      .getByRole("button", { name: QUEST_SIDEBAR_COPY.collapse })
      .click();
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

test("a panel command typed in the composer runs without the construct", async () => {
  store.listMessages.mockResolvedValue([]);
  const sent = answerChat(new Response(null));
  runChatCommandAction.mockResolvedValue({
    kind: "noted",
    note: "Added the idea “Try charcoal” to Ideas.",
  });
  await render(await chatPage());
  const box = page.getByRole("textbox", { name: CHAT_COPY.messageLabel });
  await userEvent.type(box, "/idea Try charcoal{Enter}");

  await expect.poll(() => runChatCommandAction.mock.calls.length).toBe(1);
  expect(runChatCommandAction).toHaveBeenCalledWith({
    chatId: FOX_CONVERSATION.id,
    text: "/idea Try charcoal",
    localDate: todayHere(new Date()),
  });
  await expect.element(box).toHaveValue("");
  expect(sent).not.toHaveBeenCalled();
});

describe("use_case_open_quest", () => {
  test("the quest opens on its conversation, with its sections a tap away", async () => {
    store.listMessages.mockResolvedValue([]);
    await render(await chatPage());

    await expect
      .element(page.getByRole("textbox", { name: CHAT_COPY.messageLabel }))
      .toBeVisible();
    await page.getByRole("button", { name: QUEST_SIDEBAR_COPY.expand }).click();
    await expect
      .element(
        page.getByRole("complementary", { name: QUEST_SIDEBAR_COPY.label }),
      )
      .toBeVisible();
    await Promise.all(
      [
        QUEST_SIDEBAR_COPY.spells,
        QUEST_SIDEBAR_COPY.buckets,
        QUEST_SIDEBAR_COPY.actions,
      ].map((name) =>
        expect
          .element(page.getByRole("tab", { name, exact: true }))
          .toBeVisible(),
      ),
    );
    await expect
      .element(page.getByRole("heading", { name: "Adventures" }))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole("button", { name: "New adventure" }))
      .not.toBeInTheDocument();
  });
});

describe("conversation initialization fallback", () => {
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
  test.each([PHONE_VIEWPORT, LAPTOP_VIEWPORT])(
    "the construct's button shares the breadcrumb row at $width px",
    async (size) => {
      // The later cases open the sidebar from its button, so they keep the
      // screen they had.
      const before = { width: window.innerWidth, height: window.innerHeight };
      onTestFinished(() => page.viewport(before.width, before.height));
      await page.viewport(size.width, size.height);
      store.getQuest.mockResolvedValue({ ...FOX_QUEST, dailies: true });
      store.listMessages.mockResolvedValue([]);
      await render(await chatPage());
      const banner = page.getByRole("banner");
      const heading = banner.getByRole("heading", { level: 1 });
      const construct = banner.getByRole("button", {
        name: CONSTRUCT_DISCOVERY_COPY.openProfile(
          FOX_CONVERSATION.construct.name,
        ),
      });
      await expect.element(construct).toBeVisible();
      const button = construct.element().getBoundingClientRect();
      const title = heading.element().getBoundingClientRect();
      expect(
        button.left,
        "the button follows the quest's name",
      ).toBeGreaterThanOrEqual(title.right);
      expect(
        Math.abs(
          button.top + button.height / 2 - (title.top + title.height / 2),
        ),
        "the button sits on the heading's row",
      ).toBeLessThan(button.height / 2);
      expect(
        button.right,
        "the construct stays within the row",
      ).toBeLessThanOrEqual(size.width);
      expect(button.height).toBeGreaterThanOrEqual(MINIMUM_TARGET_PX);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
        size.width,
      );

      await openPanel();
      await expect.element(sitePanel()).toBeVisible();
      await closePanel();
      await expect.element(construct).toBeVisible();

      await construct.click();
      await expect
        .element(
          page.getByRole("dialog", { name: FOX_CONVERSATION.construct.name }),
        )
        .toBeVisible();
    },
  );

  test("a quest other than the active Dailies quest shows no construct in its trail band", async () => {
    store.getQuest.mockResolvedValue({
      ...FOX_QUEST,
      dailies: true,
      status: "completed",
    });
    store.listMessages.mockResolvedValue([]);
    await render(await chatPage());
    await expect
      .element(page.getByRole("banner").getByRole("heading", { level: 1 }))
      .toBeVisible();
    await expect
      .element(
        page.getByRole("button", {
          name: CONSTRUCT_DISCOVERY_COPY.openProfile(
            FOX_CONVERSATION.construct.name,
          ),
        }),
      )
      .not.toBeInTheDocument();
  });

  test("Start Day leads the daily workspace and confirms its options", async () => {
    store.getQuest.mockResolvedValue({ ...FOX_QUEST, dailies: true });
    store.listMessages.mockResolvedValue([]);
    await render(await chatPage());
    await page.getByRole("button", { name: QUEST_SIDEBAR_COPY.expand }).click();
    const start = page.getByRole("button", {
      name: QUEST_CONVERSATION_COPY.startDay,
    });
    await expect.element(start).toBeVisible();
    const actions = page.getByRole("region", {
      name: QUEST_CONVERSATION_COPY.startDay,
      exact: true,
    });
    await expect
      .element(
        actions.getByRole("button", {
          name: QUEST_CONVERSATION_COPY.startDay,
        }),
      )
      .toBeVisible();
    await collectionTab(QUEST_SIDEBAR_COPY.spells).click();
    await expect
      .element(
        bucket(QUEST_SIDEBAR_COPY.spells).getByRole("button", {
          name: "Cast Brainstorm",
        }),
      )
      .toBeVisible();
    await start.click();
    const dialog = page.getByRole("dialog", {
      name: QUEST_CONVERSATION_COPY.startDay,
    });
    await expect.element(dialog).toBeVisible();
    await expect
      .element(
        dialog.getByRole("checkbox", {
          name: QUEST_CONVERSATION_COPY.clearTasks,
        }),
      )
      .not.toBeChecked();
    await expect
      .element(
        dialog.getByRole("checkbox", {
          name: QUEST_CONVERSATION_COPY.clearIdeas,
        }),
      )
      .not.toBeChecked();
  });

  test("Start Day sends /start-day with the chosen clearing and the browser's date", async () => {
    store.getQuest.mockResolvedValue({ ...FOX_QUEST, dailies: true });
    store.listMessages.mockResolvedValue([]);
    runChatCommandAction.mockResolvedValue({
      kind: "noted",
      note: "Started a new day.",
    });
    await render(await chatPage());
    await page.getByRole("button", { name: QUEST_SIDEBAR_COPY.expand }).click();
    await page
      .getByRole("button", { name: QUEST_CONVERSATION_COPY.startDay })
      .click();
    const dialog = page.getByRole("dialog", {
      name: QUEST_CONVERSATION_COPY.startDay,
    });
    await dialog
      .getByRole("checkbox", { name: QUEST_CONVERSATION_COPY.clearTasks })
      .click();
    await dialog
      .getByRole("button", { name: QUEST_CONVERSATION_COPY.startDay })
      .click();

    await expect.poll(() => runChatCommandAction.mock.calls.length).toBe(1);
    expect(runChatCommandAction).toHaveBeenCalledWith({
      chatId: FOX_CONVERSATION.id,
      text: "/start-day clear-tasks",
      localDate: todayHere(new Date()),
    });
  });

  test("Undo Start Day sends /undo-start-day, and a refusal says why", async () => {
    store.getQuest.mockResolvedValue({ ...FOX_QUEST, dailies: true });
    store.listMessages.mockResolvedValue([]);
    readDailiesRecord.mockResolvedValueOnce({
      days: [
        {
          date: "2026-11-14",
          startedAt: new Date(Date.now() - STARTED_MS_AGO),
        },
      ],
      undoable: true,
    });
    runChatCommandAction.mockResolvedValue({
      kind: "problem",
      text: "There is no day to undo.",
    });
    await render(await chatPage());
    await page.getByRole("button", { name: QUEST_SIDEBAR_COPY.expand }).click();
    const actions = page.getByRole("region", {
      name: QUEST_CONVERSATION_COPY.startDay,
      exact: true,
    });
    await actions
      .getByRole("button", { name: QUEST_CONVERSATION_COPY.undoStartDay })
      .click();

    await expect
      .element(actions.getByRole("alert"))
      .toHaveTextContent("There is no day to undo.");
    expect(runChatCommandAction).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: FOX_CONVERSATION.id,
        text: "/undo-start-day",
      }),
    );
  });

  test("Start Day shows how long ago the last day started, and Undo until a message", async () => {
    store.getQuest.mockResolvedValue({ ...FOX_QUEST, dailies: true });
    store.listMessages.mockResolvedValue([]);
    readDailiesRecord.mockResolvedValueOnce({
      days: [
        {
          date: "2026-11-14",
          startedAt: new Date(Date.now() - STARTED_MS_AGO),
        },
      ],
      undoable: true,
    });
    await render(await chatPage());
    await page.getByRole("button", { name: QUEST_SIDEBAR_COPY.expand }).click();
    const actions = page.getByRole("region", {
      name: QUEST_CONVERSATION_COPY.startDay,
      exact: true,
    });
    await expect
      .element(
        actions.getByText(
          QUEST_CONVERSATION_COPY.lastDayStarted(HOURS_AGO * HOUR_MS),
        ),
      )
      .toBeVisible();
    await expect
      .element(
        actions.getByRole("button", {
          name: QUEST_CONVERSATION_COPY.undoStartDay,
        }),
      )
      .toBeVisible();
  });

  test("a Dailies quest with no day started says so and offers no Undo", async () => {
    store.getQuest.mockResolvedValue({ ...FOX_QUEST, dailies: true });
    store.listMessages.mockResolvedValue([]);
    await render(await chatPage());
    await page.getByRole("button", { name: QUEST_SIDEBAR_COPY.expand }).click();
    const actions = page.getByRole("region", {
      name: QUEST_CONVERSATION_COPY.startDay,
      exact: true,
    });
    await expect
      .element(actions.getByText(QUEST_CONVERSATION_COPY.noDayYet))
      .toBeVisible();
    await expect
      .element(
        actions.getByRole("button", {
          name: QUEST_CONVERSATION_COPY.undoStartDay,
        }),
      )
      .not.toBeInTheDocument();
  });

  test("an ordinary quest offers no Start Day", async () => {
    store.listMessages.mockResolvedValue([]);
    await render(await chatPage());

    await expect
      .element(page.getByRole("textbox", { name: CHAT_COPY.messageLabel }))
      .toBeVisible();
    await expect
      .element(
        page.getByRole("button", { name: QUEST_CONVERSATION_COPY.startDay }),
      )
      .not.toBeInTheDocument();
  });
});

describe("use_case_daily_streaks", () => {
  test("a recurring task shows its streak, and Day grid shows its days with the gap", async () => {
    store.getQuest.mockResolvedValue({ ...FOX_QUEST, dailies: true });
    store.listMessages.mockResolvedValue([]);
    readTasksState.mockResolvedValueOnce({
      version: 1,
      tasks: {
        items: [
          { number: 1, text: STRETCH, done: true, recurring: true },
          { number: 2, text: VET, done: false },
        ],
        nextNumber: 3,
      },
      undone: [],
    });
    readDailiesRecord.mockResolvedValueOnce({
      days: [
        {
          date: "2026-11-10",
          startedAt: new Date("2026-11-10T08:00:00Z"),
          tasks: [{ number: 1, text: STRETCH, done: true }],
        },
        {
          date: "2026-11-12",
          startedAt: new Date("2026-11-12T08:00:00Z"),
          tasks: [{ number: 1, text: STRETCH, done: true }],
        },
        {
          date: "2026-11-13",
          startedAt: new Date("2026-11-13T08:00:00Z"),
          tasks: [{ number: 1, text: STRETCH, done: true }],
        },
        { date: "2026-11-14", startedAt: new Date("2026-11-14T08:00:00Z") },
      ],
      undoable: false,
    });
    await render(await chatPage());
    await page.getByRole("button", { name: QUEST_SIDEBAR_COPY.expand }).click();
    await expect
      .element(
        page.getByText(
          `${TASKS_COPY.streak(STRETCH_STREAK)}. Milestone reached.`,
        ),
      )
      .toBeInTheDocument();

    await page.getByRole("button", { name: TASKS_COPY.actions(VET) }).click();
    await expect
      .element(
        page.getByRole("menuitem", { name: TASKS_COPY.makeRecurring(VET) }),
      )
      .toBeVisible();
    await userEvent.keyboard("{Escape}");

    await openBucket(QUEST_SIDEBAR_COPY.dayGrid);
    const progress = bucket(QUEST_SIDEBAR_COPY.dayGrid);
    await expect
      .element(progress.getByRole("heading", { name: DAY_GRID_COPY.heading }))
      .toBeVisible();
    await expect
      .element(
        progress.getByText(DAY_GRID_COPY.day("Wed", "2026-11-11", "gap")),
      )
      .toBeInTheDocument();
    await expect
      .element(
        progress.getByText(DAY_GRID_COPY.day("Sat", "2026-11-14", "done")),
      )
      .toBeInTheDocument();
  });

  test("an ordinary quest has no streaks or day grid", async () => {
    store.listMessages.mockResolvedValue([]);
    await render(await chatPage());
    await page.getByRole("button", { name: QUEST_SIDEBAR_COPY.expand }).click();
    await openAction(PROGRESS_TIMELINE_COPY.heading);
    await expect
      .element(page.getByRole("heading", { name: DAY_GRID_COPY.heading }))
      .not.toBeInTheDocument();
  });
});

test("Stop Spell stays beside the composer and sends stop without replacing the draft", async () => {
  store.getQuest.mockResolvedValue({ ...FOX_QUEST, dailies: true });
  store.readQuestConversation.mockResolvedValue({
    ...FOX_CONVERSATION,
    spell: "brainstorm",
  });
  store.listMessages.mockResolvedValue([]);
  const held = holdBeforeChunk(
    [{ type: "start", messageId: "stop-activity-reply" }, { type: "finish" }],
    1,
  );
  const sent = answerChat(held.response);
  await render(await chatPage());
  const box = page.getByRole("textbox", { name: CHAT_COPY.messageLabel });
  await box.fill("Keep this draft");
  await page
    .getByRole("button", { name: "Stop Brainstorm", exact: true })
    .click();
  await expect.element(page.getByText("stop", { exact: true })).toBeVisible();
  await expect.element(box).toHaveValue("Keep this draft");
  await expect.poll(() => sent.mock.calls.length).toBe(1);
  expect(String(sent.mock.calls[0]?.[1]?.body)).toContain('"text":"stop"');
  held.release();
});

const MAX_COMPOSER_BOTTOM_GAP = 64;

test.each([PHONE_VIEWPORT, LAPTOP_VIEWPORT])(
  "a short conversation keeps its composer near the bottom at $width px",
  async (size) => {
    await page.viewport(size.width, size.height);
    store.listMessages.mockResolvedValue([]);
    await render(
      <div className="flex min-h-dvh flex-col">{await chatPage()}</div>,
    );
    const collapse = page.getByRole("button", {
      name: QUEST_SIDEBAR_COPY.collapse,
    });
    if (collapse.query() !== null) {
      await collapse.click();
    }
    const send = page.getByRole("button", {
      name: CHAT_COPY.send,
      exact: true,
    });
    await expect.element(send).toBeVisible();
    const gap =
      window.innerHeight - send.element().getBoundingClientRect().bottom;
    expect(gap).toBeGreaterThanOrEqual(0);
    expect(gap).toBeLessThanOrEqual(MAX_COMPOSER_BOTTOM_GAP);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      size.width,
    );
  },
);

vi.mock("@/app/(workspace)/spellbook/actions.ts", () => ({
  newSpellAction: vi.fn(),
  cloneSpellAction: vi.fn(),
  saveSpellAction: vi.fn(),
  retireSpellAction: vi.fn(),
}));
vi.mock("@/spells/own-spell-store.ts", () => ({
  findSpell: vi.fn().mockResolvedValue(undefined),
  listOwnSpells: vi.fn().mockResolvedValue([]),
}));

describe("use_case_tailored_quest_panels", () => {
  beforeEach(async () => {
    await page.viewport(PHONE_VIEWPORT.width, PHONE_VIEWPORT.height);
  });
  test("renamed Dailies keeps day controls and a direct day-grid tab", async () => {
    store.getQuest.mockResolvedValue({
      ...FOX_QUEST,
      name: "Morning rhythm",
      dailies: true,
    });
    store.listMessages.mockResolvedValue([]);
    await render(await chatPage());
    await page.getByRole("button", { name: QUEST_SIDEBAR_COPY.expand }).click();
    await expect
      .element(
        page.getByRole("region", {
          name: QUEST_CONVERSATION_COPY.startDay,
          exact: true,
        }),
      )
      .toBeVisible();
    await openBucket(QUEST_SIDEBAR_COPY.dayGrid);
    await expect
      .element(
        page.getByRole("region", {
          name: QUEST_SIDEBAR_COPY.nextTask,
          exact: true,
        }),
      )
      .not.toBeInTheDocument();
  });

  test("an ordinary quest named Dailies keeps next-task context and never gets day controls", async () => {
    store.getQuest.mockResolvedValue({
      ...FOX_QUEST,
      name: "Dailies",
      dailies: false,
    });
    store.listMessages.mockResolvedValue([]);
    await render(await chatPage());
    await page.getByRole("button", { name: QUEST_SIDEBAR_COPY.expand }).click();
    await expect
      .element(
        page.getByRole("region", {
          name: QUEST_SIDEBAR_COPY.nextTask,
          exact: true,
        }),
      )
      .toBeVisible();
    await collectionTab(QUEST_SIDEBAR_COPY.buckets).click();
    await expect
      .element(
        page.getByRole("menuitemradio", { name: QUEST_SIDEBAR_COPY.dayGrid }),
      )
      .not.toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await expect
      .element(
        page.getByRole("button", {
          name: QUEST_CONVERSATION_COPY.startDay,
          exact: true,
        }),
      )
      .not.toBeInTheDocument();
  });

  test.each(["completed", "abandoned"] as const)(
    "%s Dailies keeps its composition without Start Day",
    async (status) => {
      store.getQuest.mockResolvedValue({ ...FOX_QUEST, dailies: true, status });
      store.listMessages.mockResolvedValue([]);
      await render(await chatPage());
      await page
        .getByRole("button", { name: QUEST_SIDEBAR_COPY.expand })
        .click();
      await openBucket(QUEST_SIDEBAR_COPY.dayGrid);
      await expect
        .element(
          page.getByRole("button", {
            name: QUEST_CONVERSATION_COPY.startDay,
            exact: true,
          }),
        )
        .not.toBeInTheDocument();
      await openAction(QUEST_SIDEBAR_COPY.status);
      await expect
        .element(page.getByRole("button", { name: QUEST_STATUS_COPY.restore }))
        .toBeVisible();
    },
  );
});
