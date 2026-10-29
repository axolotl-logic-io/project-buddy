import type { JSX } from "react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import ChatPage from "@/app/(workspace)/chats/[chatId]/page.tsx";
import type { getChat, listMessages } from "@/chats/store.ts";
import { THEME_IDS } from "@/themes/themes.ts";
import {
  SIGNED_IN_USER,
  signInAs,
} from "../../../../auth/current-user-test-kit.ts";
import { chatNameFixture } from "../../../../chats/chat-name-fixtures.ts";
import {
  installThemeFonts,
  loadFonts,
} from "../../../../themes/theme-fonts-test-kit.ts";
import { applyTheme } from "../../../../themes/theme-test-kit.ts";
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
// The pinned header's greatest share of a phone's screen, so the
// conversation keeps most of it.
const MOST_HEADER_SHARE = 0.25;

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

async function chatPage(): Promise<JSX.Element> {
  const content = await ChatPage({
    params: Promise.resolve({ chatId: FOX_CHAT.id }),
    searchParams: Promise.resolve({}),
  });
  return inWorkspace(content);
}
