// Each page that isn't found says what can't be found: any page, or, for a
// quest, its Journal or an adventure, the quest or adventure. A page whose
// notFound() runs while rendering, such as Invitations for an
// ordinary user, reaches the browser without <head>'s pre-paint scripts,
// and React renders <html> with the default theme attributes. The
// not-found page applies the saved mode itself, so it looks like every
// other page.

import { afterEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import AdventureNotFound from "@/app/(workspace)/chats/[chatId]/not-found.tsx";
import QuestNotFound from "@/app/(workspace)/quests/[questId]/(overview)/not-found.tsx";
import NotFound from "@/app/not-found.tsx";
import { userMessage } from "@/errors/app-error.ts";
import {
  DEFAULT_THEME_ATTRIBUTES,
  MODE_ATTRIBUTE,
  THEME_ATTRIBUTE,
} from "@/themes/theme-choice.ts";
import { PROBLEMS_COPY } from "@/ui/copy/problems.ts";
import { applyTheme } from "../themes/theme-test-kit.ts";

// The browser's cookies when Dark is saved, beside a stale cookie from the
// removed Extras switches, which must hide nothing.
const SAVED_COOKIES = "theme=parchment.dark; hidden-extras=page-decorations";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("use_case_open_missing_page", () => {
  test("an address the site doesn't have says the page can't be found", async () => {
    await render(<NotFound />);
    await expect
      .element(page.getByText(PROBLEMS_COPY.pageNotFound))
      .toBeVisible();
    await expect
      .element(page.getByRole("link", { name: PROBLEMS_COPY.questsLink }))
      .toHaveAttribute("href", "/quests");
  });

  test.each([
    { missing: "quest", view: <QuestNotFound /> },
    { missing: "adventure", view: <AdventureNotFound /> },
  ])(
    "a missing $missing says the quest or adventure can't be found",
    async ({ view }) => {
      await render(view);
      await expect
        .element(page.getByText(userMessage("not-found")))
        .toBeVisible();
    },
  );
});

describe("use_case_choose_theme", () => {
  test("a page that isn't found keeps the saved mode and hides nothing", async () => {
    vi.spyOn(Document.prototype, "cookie", "get").mockReturnValue(
      SAVED_COOKIES,
    );
    applyTheme(DEFAULT_THEME_ATTRIBUTES[THEME_ATTRIBUTE]);
    await render(<NotFound />);

    const root = document.documentElement;
    expect(root.getAttribute(MODE_ATTRIBUTE)).toBe("dark");
    expect(root.hasAttribute("data-hide")).toBe(false);
  });
});
