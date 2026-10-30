import type { JSX } from "react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import ChatPage from "@/app/(workspace)/chats/[chatId]/page.tsx";
import type { getChat, listMessages } from "@/chats/store.ts";
import { THEME_IDS } from "@/themes/themes.ts";
import { chatNameFixture } from "../../../../../support/chats/chat-name-fixtures.ts";
import {
  SIGNED_IN_USER,
  signInAs,
} from "../../../../auth/current-user-test-kit.ts";
import {
  installThemeFonts,
  loadFonts,
} from "../../../../themes/theme-fonts-test-kit.ts";
import { applyTheme } from "../../../../themes/theme-test-kit.ts";
import {
  LAPTOP_VIEWPORT,
  NARROWEST_VIEWPORT,
  PHONE_VIEWPORT,
} from "../../../../viewports-test-kit.ts";
import { inWorkspace } from "../../../workspace-test-kit.tsx";
import { FOX_CHAT, STANDALONE_CHAT } from "../../page-fixtures.ts";

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

// Less than half the reported screenshot’s 254-pixel header.
const MAX_COMPACT_HEADER_HEIGHT = 112;
const MAX_WIDE_HEADER_HEIGHT = 140;

beforeAll(() => {
  installThemeFonts();
});

afterEach(async () => {
  await page.viewport(LAPTOP_VIEWPORT.width, LAPTOP_VIEWPORT.height);
  vi.clearAllMocks();
});

const LONG_NAME_REPEATS = 30;
const CHAT_NAME_REPEATS = 15;
const LONG_PROJECT = "Project".repeat(LONG_NAME_REPEATS);
const LONG_BUDDY = "Buddy".repeat(LONG_NAME_REPEATS);
const LONG_CHAT = "Chat".repeat(CHAT_NAME_REPEATS);
const TOUCH_TARGET = 44;

describe("use_case_breadcrumbs_in_long_chat", () => {
  for (const theme of THEME_IDS) {
    for (const viewport of [
      NARROWEST_VIEWPORT,
      PHONE_VIEWPORT,
      LAPTOP_VIEWPORT,
    ]) {
      test(`compact long names in ${theme} at ${viewport.width}px`, async () => {
        applyTheme(theme);
        document.documentElement.classList.add("h-full");
        document.body.classList.add("flex", "min-h-full", "flex-col");
        signInAs(SIGNED_IN_USER);
        store.getChat.mockResolvedValue({
          ...FOX_CHAT,
          project: { ...FOX_CHAT.project, name: LONG_PROJECT },
          buddy: { ...FOX_CHAT.buddy, name: LONG_BUDDY },
          name: chatNameFixture(LONG_CHAT),
        });
        store.listMessages.mockResolvedValue([]);
        await page.viewport(viewport.width, viewport.height);
        const screen = await render(await chatPage());
        const heading = page.getByRole("heading", {
          level: 1,
          name: `${LONG_CHAT} Chat with ${LONG_BUDDY}`,
        });
        await expect.element(heading).toBeVisible();
        await expect.poll(() => window.innerWidth).toBe(viewport.width);
        await loadFonts();
        const header = heading.element().closest("header");
        let maximumHeight = MAX_COMPACT_HEADER_HEIGHT;
        if (viewport.width === LAPTOP_VIEWPORT.width) {
          maximumHeight = MAX_WIDE_HEADER_HEIGHT;
        }
        expect(
          header?.getBoundingClientRect().height ?? Number.POSITIVE_INFINITY,
        ).toBeLessThanOrEqual(maximumHeight);
        expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
          viewport.width,
        );
        const navigation = page.getByRole("link", { name: LONG_PROJECT });
        const pencil = page.getByRole("button", { name: "Rename chat" });
        await expect.element(navigation).toBeVisible();
        await expect.element(pencil).toBeVisible();
        for (const control of [navigation, pencil]) {
          const bounds = control.element().getBoundingClientRect();
          expect(bounds.height).toBeGreaterThanOrEqual(TOUCH_TARGET);
          expect(bounds.width).toBeGreaterThanOrEqual(TOUCH_TARGET);
        }
        navigation.element().focus();
        await expect.element(navigation).toHaveFocus();
        pencil.element().focus();
        await expect.element(pencil).toHaveFocus();
        store.getChat.mockResolvedValue(STANDALONE_CHAT);
        await screen.rerender(await chatPage());
        await expect
          .element(
            page.getByRole("link", { name: "Chats", exact: true }).last(),
          )
          .toBeVisible();
        await expect
          .element(page.getByRole("heading", { level: 1 }))
          .toHaveTextContent(
            `New chat Chat with ${STANDALONE_CHAT.buddy.name}`,
          );
        expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
          viewport.width,
        );
      });
    }
  }
});

async function chatPage(): Promise<JSX.Element> {
  const content = await ChatPage({
    params: Promise.resolve({ chatId: FOX_CHAT.id }),
    searchParams: Promise.resolve({}),
  });
  return inWorkspace(content);
}
