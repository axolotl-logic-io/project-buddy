// "use_case_breadcrumbs_in_long_chat" in use-cases/chats.md, in Chromium and
// WebKit: on a phone, in every theme, the chat's pinned header, which holds
// its name, takes at most a quarter of the screen's height, so the
// conversation keeps most of it. The theme fonts are loaded, since the
// header's height depends on them. That the header stays on screen and in
// reach is page.browser.test.tsx's, and the keyboard setting page.test.tsx's.
import type { JSX } from "react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import ChatPage from "@/app/(workspace)/chats/[chatId]/page.tsx";
import type { getChat, listMessages } from "@/chats/store.ts";
import { DEFAULT_FLAG_ATTRIBUTES } from "@/flags/flag-choice.ts";
import {
  DEFAULT_THEME_ATTRIBUTES,
  MODE_ATTRIBUTE,
  THEME_ATTRIBUTE,
} from "@/themes/theme-choice.ts";
import { THEME_IDS, type ThemeId } from "@/themes/themes.ts";
import {
  SIGNED_IN_USER,
  signInAs,
} from "../../../../auth/current-user-test-kit.ts";
import { chatNameFixture } from "../../../../chats/chat-name-fixtures.ts";
import {
  installThemeFonts,
  loadFonts,
} from "../../../../themes/theme-fonts-test-kit.ts";
import {
  LAPTOP_VIEWPORT,
  PHONE_VIEWPORT,
} from "../../../../viewports-test-kit.ts";
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

vi.mock("@/app/(workspace)/chats/[chatId]/actions.ts", () => ({
  renameChatAction: vi.fn(),
}));

const CHAT_NAME = "Beveling the den's roof";
// The pinned header's greatest share of a phone's screen, so the
// conversation keeps most of it.
const MOST_HEADER_SHARE = 0.25;

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

// Shows theme in Light mode, with the default extras, as the site's pre-paint
// script would.
function applyTheme(theme: ThemeId): void {
  const html = document.documentElement;
  for (const [name, value] of Object.entries({
    ...DEFAULT_THEME_ATTRIBUTES,
    ...DEFAULT_FLAG_ATTRIBUTES,
  })) {
    html.setAttribute(name, value);
  }
  html.setAttribute(THEME_ATTRIBUTE, theme);
  html.setAttribute(MODE_ATTRIBUTE, "light");
}

beforeAll(() => {
  installThemeFonts();
});

afterEach(async () => {
  await page.viewport(LAPTOP_VIEWPORT.width, LAPTOP_VIEWPORT.height);
  vi.clearAllMocks();
});

describe("use_case_breadcrumbs_in_long_chat", () => {
  for (const theme of THEME_IDS) {
    test(`the pinned header takes at most a quarter of a phone's screen, in ${theme}`, async () => {
      applyTheme(theme);
      document.documentElement.classList.add("h-full");
      document.body.classList.add("flex", "min-h-full", "flex-col");
      signInAs(SIGNED_IN_USER);
      store.getChat.mockResolvedValue({
        ...FOX_CHAT,
        name: chatNameFixture(CHAT_NAME),
      });
      store.listMessages.mockResolvedValue([]);
      await page.viewport(PHONE_VIEWPORT.width, PHONE_VIEWPORT.height);
      await render(await chatPage());
      const chatName = page.getByRole("heading", {
        exact: false,
        level: 1,
        name: CHAT_NAME,
      });
      await expect.element(chatName).toBeVisible();
      await expect
        .poll(() => window.innerWidth, { message: "the viewport is set" })
        .toBe(PHONE_VIEWPORT.width);
      await loadFonts();

      const header = chatName.element().closest("header");
      expect(header, "the header holding the chat's name").not.toBeNull();
      expect(
        header?.getBoundingClientRect().height ?? Number.POSITIVE_INFINITY,
      ).toBeLessThanOrEqual(PHONE_VIEWPORT.height * MOST_HEADER_SHARE);
    });
  }
});
