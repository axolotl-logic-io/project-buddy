import { afterEach, beforeAll, describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { ChatList } from "@/components/chat-list.tsx";
import {
  DEFAULT_FLAG_ATTRIBUTES,
  HIDE_ATTRIBUTE,
} from "@/flags/flag-choice.ts";
import {
  DEFAULT_THEME_ATTRIBUTES,
  MODE_ATTRIBUTE,
  THEME_ATTRIBUTE,
} from "@/themes/theme-choice.ts";
import { THEME_IDS, type ThemeId } from "@/themes/themes.ts";
import { CHAT_NAME_COPY } from "@/ui/copy/chat.ts";
import {
  installThemeFonts,
  loadFonts,
} from "../themes/theme-fonts-test-kit.ts";
import {
  LAPTOP_VIEWPORT,
  NARROWEST_VIEWPORT,
  PHONE_VIEWPORT,
} from "../viewports-test-kit.ts";
import { PROJECT_CHAT } from "./chat-list-fixtures.ts";

const LONG_NAME_REPETITIONS = 30;
const LONG_PROJECT_NAMES = [
  {
    label: "many words",
    name: "A very long project name ".repeat(LONG_NAME_REPETITIONS),
  },
  {
    label: "a single word",
    name: "UnbrokenProjectName".repeat(LONG_NAME_REPETITIONS),
  },
];
const MODES = ["light", "dark"] as const;

beforeAll(() => {
  installThemeFonts();
});

afterEach(async () => {
  for (const [name, value] of Object.entries(DEFAULT_FLAG_ATTRIBUTES)) {
    document.documentElement.setAttribute(name, value);
  }
  for (const [name, value] of Object.entries(DEFAULT_THEME_ATTRIBUTES)) {
    document.documentElement.setAttribute(name, value);
  }
  await page.viewport(LAPTOP_VIEWPORT.width, LAPTOP_VIEWPORT.height);
});

function applyTheme(theme: ThemeId, mode: "light" | "dark"): void {
  for (const [attribute, value] of Object.entries(DEFAULT_THEME_ATTRIBUTES)) {
    document.documentElement.setAttribute(attribute, value);
  }
  document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);
  document.documentElement.setAttribute(MODE_ATTRIBUTE, mode);
}

describe("ChatList project badges with hidden chat names", () => {
  test("keeps the project badge visible and the conversation named by its buddy alone", async () => {
    document.documentElement.setAttribute(HIDE_ATTRIBUTE, "chat-names");
    await render(<ChatList chats={[PROJECT_CHAT]} showProjectNames={true} />);

    const badge = page.getByText(PROJECT_CHAT.projectName, { exact: true });
    const link = page.getByRole("link");
    await expect.element(badge).toBeVisible();
    await expect.element(link).toHaveAccessibleName(PROJECT_CHAT.buddy.name);
    await expect
      .element(link)
      .toHaveAttribute("href", `/chats/${PROJECT_CHAT.id}`);
    expect(page.getByRole("listitem").element()).toContainElement(
      badge.element(),
    );
    expect(link.element()).not.toContainElement(badge.element());
  });
});

describe("ChatList project badge containment", () => {
  for (const theme of THEME_IDS) {
    for (const mode of MODES) {
      for (const viewport of [NARROWEST_VIEWPORT, PHONE_VIEWPORT]) {
        test.each(LONG_PROJECT_NAMES)(
          `truncates $label at ${viewport.width}px in ${theme} ${mode}`,
          async ({ name }) => {
            applyTheme(theme, mode);
            await page.viewport(viewport.width, viewport.height);
            await render(
              <div className="page-column">
                <ChatList
                  chats={[{ ...PROJECT_CHAT, projectName: name }]}
                  showProjectNames={true}
                />
              </div>,
            );
            const badge = page.getByText(name, { exact: true });
            await expect.element(badge).toBeVisible();
            await expect.poll(() => window.innerWidth).toBe(viewport.width);
            await loadFonts();

            const element = badge.element();
            const box = element.getBoundingClientRect();
            const card = page
              .getByRole("listitem")
              .element()
              .getBoundingClientRect();
            const style = getComputedStyle(element);
            expect(box.width).toBeGreaterThan(0);
            expect(box.left).toBeGreaterThanOrEqual(card.left);
            expect(box.right).toBeLessThanOrEqual(card.right);
            expect(card.left).toBeGreaterThanOrEqual(0);
            expect(card.right).toBeLessThanOrEqual(viewport.width);
            expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
              viewport.width,
            );
            expect(element.scrollWidth).toBeGreaterThan(element.clientWidth);
            expect(style.textOverflow).toBe("ellipsis");
            expect(style.overflowX).toBe("hidden");
            expect(style.whiteSpace).toBe("nowrap");
            await expect
              .element(page.getByRole("link"))
              .toHaveAccessibleName(
                CHAT_NAME_COPY.listTitle(
                  PROJECT_CHAT.name,
                  PROJECT_CHAT.buddy.name,
                ),
              );
          },
        );
      }
    }
  }
});
