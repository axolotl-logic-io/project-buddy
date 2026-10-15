// "use_case_breadcrumbs_in_long_chat" in use-cases/chats.md, in Chromium and
// WebKit: a chat longer than the screen, scrolled to its end. The way back
// to the project, the chat's name and the composer stay wholly on screen and
// in reach, on a laptop and on a phone, and a jump to a message lands below
// the pinned header. The page sits in the main landmark and the workspace's
// column, as the layouts render it; the site's stylesheet comes from
// vitest.browser-setup.ts. The per-theme header and the phone's keyboard are
// e2e/chats-long-chat.spec.ts's.
import type { UIMessage } from "ai";
import type { JSX } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { FOX_CHAT } from "@/app/(workspace)/page-fixtures.ts";
import { SIGNED_IN_USER, signInAs } from "@/auth/current-user-test-kit.ts";
import { chatNameFixture } from "@/chats/chat-name-fixtures.ts";
import type { getChat, listMessages } from "@/chats/store.ts";
import { DEFAULT_FLAG_ATTRIBUTES } from "@/flags/flag-choice.ts";
import { DEFAULT_THEME_ATTRIBUTES } from "@/themes/theme-choice.ts";
import { markdownReplyText } from "@/tutor/mock-markdown-test-kit.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import ChatPage from "./page.tsx";

vi.mock(
  "@/auth/current-user.ts",
  () => import("@/auth/current-user-test-kit.ts"),
);

const store = vi.hoisted(() => ({
  getChat: vi.fn<typeof getChat>(),
  listMessages: vi.fn<typeof listMessages>(),
}));
vi.mock("@/chats/store.ts", () => store);

// ChatView refreshes the page through the App Router.
vi.mock("next/navigation", () => import("@/components/router-test-kit.ts"));

vi.mock("./actions.ts", () => ({ renameChatAction: vi.fn() }));

const CHAT_NAME = "Beveling the den's roof";
// The screens the case is checked on, as e2e/viewports.ts:5-8 sets them: a
// laptop's and a phone's, in CSS pixels.
const VIEWPORTS = [
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
] as const;
// The Python block that ends each reply, shown once the reply is laid out.
const REPLY_END = "bpy.ops.mesh.bevel(offset=0.1)";
// Three replies fill a laptop's screen several times over.
const EXCHANGES = 3;

// Her question and the mock tutor's Markdown reply, EXCHANGES times.
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

// The chat's page, in the main landmark and the workspace's column.
async function chatPage(): Promise<JSX.Element> {
  const content = await ChatPage({
    params: Promise.resolve({ chatId: FOX_CHAT.id }),
    searchParams: Promise.resolve({}),
  });
  return (
    <main className="flex flex-1 flex-col">
      <div className="page-column">{content}</div>
    </main>
  );
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
      const backLink = page.getByRole("link", { name: FOX_CHAT.projectName });
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
        `/projects/${FOX_CHAT.projectId}`,
      );
    });
  }
});
