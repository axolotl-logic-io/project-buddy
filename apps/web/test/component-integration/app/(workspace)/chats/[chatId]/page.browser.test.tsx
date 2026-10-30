// "use_case_breadcrumbs_in_long_chat" in use-cases/chats.md, in Chromium and
// WebKit: a chat longer than the screen, scrolled to its end. The way back
// to the project, the chat's name and the composer stay wholly on screen and
// in reach, on a laptop and on a phone, and a jump to a message lands below
// the pinned header. The page sits in the main landmark and the workspace's
// column, as the layouts render it; the site's stylesheet comes from
// vitest.browser-setup.ts. The per-theme header is
// long-chat-header.browser.test.tsx's, and the phone's keyboard page.test.tsx's.
// And "use_case_hide_extras" in use-cases/appearance.md: the pinned header,
// switched off, scrolls away and draws nothing over the conversation.
import type { UIMessage } from "ai";
import type { JSX } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import ChatPage from "@/app/(workspace)/chats/[chatId]/page.tsx";
import type { getChat, listMessages } from "@/chats/store.ts";
import {
  applyHiddenFlags,
  DEFAULT_FLAG_ATTRIBUTES,
} from "@/flags/flag-choice.ts";
import { DEFAULT_HIDDEN_FLAGS } from "@/flags/flags.ts";
import { DEFAULT_THEME_ATTRIBUTES } from "@/themes/theme-choice.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import { chatNameFixture } from "../../../../../support/chats/chat-name-fixtures.ts";
import {
  SIGNED_IN_USER,
  signInAs,
} from "../../../../auth/current-user-test-kit.ts";
import { markdownReplyText } from "../../../../replies/mock-markdown-test-kit.ts";
import {
  LAPTOP_VIEWPORT,
  PHONE_VIEWPORT,
} from "../../../../viewports-test-kit.ts";
import { inWorkspace } from "../../../workspace-test-kit.tsx";
import { FOX_CHAT } from "../../page-fixtures.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../../../../auth/current-user-test-kit.ts"),
);

const store = vi.hoisted(() => ({
  getChat: vi.fn<typeof getChat>(),
  listMessages: vi.fn<typeof listMessages>(),
}));
vi.mock("@/chats/store.ts", () => store);

// ChatView refreshes the page through the App Router.
vi.mock(
  "next/navigation",
  () => import("../../../../components/router-test-kit.ts"),
);

vi.mock(
  "@/activities/activity-choices.ts",
  () => import("../../../../activities/activity-choices-test-kit.ts"),
);
vi.mock(
  "@/activities/activity-sessions.ts",
  () => import("../../../../activities/activity-sessions-test-kit.ts"),
);
vi.mock("@/app/(workspace)/chats/[chatId]/actions.ts", () => ({
  changeActivityAction: vi.fn(),
  renameChatAction: vi.fn(),
}));

const CHAT_NAME = "Beveling the den's roof";
// The screens the case is checked on: a laptop's and a phone's.
const VIEWPORTS = [LAPTOP_VIEWPORT, PHONE_VIEWPORT] as const;
// The Python block that ends each reply, shown once the reply is laid out.
const REPLY_END = "bpy.ops.mesh.bevel(offset=0.1)";
// Three replies fill a laptop's screen several times over.
const EXCHANGES = 3;
// The height of the band of the conversation one screen down that
// lineOneScreenDown finds, in CSS px: wider than the pinned header's fade.
const ONE_SCREEN_DOWN_BAND = 64;

// Her question and the mock buddy's Markdown reply, EXCHANGES times.
function longChat(): UIMessage[] {
  return Array.from({ length: EXCHANGES }, (_, index): UIMessage[] => [
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
  store.getChat.mockResolvedValue({
    ...FOX_CHAT,
    name: chatNameFixture(CHAT_NAME),
  });
  store.listMessages.mockResolvedValue(longChat());
});

afterEach(() => {
  window.scrollTo(0, 0);
  vi.clearAllMocks();
});

describe("use_case_breadcrumbs_in_long_chat", () => {
  for (const viewport of VIEWPORTS) {
    test(`${viewport.width} px wide`, async () => {
      await page.viewport(viewport.width, viewport.height);
      await render(await chatPage());
      const backLink = page.getByRole("link", { name: FOX_CHAT.project.name });
      const chatName = page.getByRole("heading", {
        exact: false,
        level: 1,
        name: CHAT_NAME,
      });
      const conversation = page.getByRole("list", {
        name: CHAT_COPY.conversationLabel,
      });
      await expect
        .poll(() => conversation.element().textContent)
        .toContain(REPLY_END);

      await scrollToBottom();
      // Each wholly on screen, and in reach.
      const targets = [
        backLink,
        chatName,
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
        chatName.element().getBoundingClientRect().bottom,
      );

      expect(backLink.element()).toHaveAttribute(
        "href",
        `/projects/${FOX_CHAT.project.id}`,
      );
    });
  }
});

describe("use_case_hide_extras", () => {
  test("the pinned chat header, switched off, scrolls away and leaves nothing behind", async () => {
    await page.viewport(LAPTOP_VIEWPORT.width, LAPTOP_VIEWPORT.height);
    await render(await chatPage());
    const backLink = page.getByRole("link", { name: FOX_CHAT.project.name });
    const conversation = page.getByRole("list", {
      name: CHAT_COPY.conversationLabel,
    });
    await expect
      .poll(() => conversation.element().textContent)
      .toContain(REPLY_END);

    applyHiddenFlags(["pinned-chat-header", ...DEFAULT_HIDDEN_FLAGS]);
    await scrollToBottom();
    await expect.element(backLink).not.toBeInViewport();
    const line = lineOneScreenDown(conversation.element());
    expect(topmostAtCentre(line), "a tap one screen down reaches it").toBe(
      true,
    );
    const unpinned = await page.screenshot({ element: line, save: false });

    applyHiddenFlags(DEFAULT_HIDDEN_FLAGS);
    await scrollToBottom();
    await expect.element(backLink).toBeInViewport();
    expect(lineOneScreenDown(conversation.element())).toBe(line);
    const pinned = await page.screenshot({ element: line, save: false });
    expect(
      unpinned === pinned,
      "nothing drawn over the conversation one screen down",
    ).toBe(true);
  });
});

async function chatPage(): Promise<JSX.Element> {
  const content = await ChatPage({
    params: Promise.resolve({ chatId: FOX_CHAT.id }),
    searchParams: Promise.resolve({}),
  });
  return inWorkspace(content);
}
