// use_case_choose_theme, saved: a signed-in user's choice is saved in this
// browser's cookie, so every later page preloads that theme's fonts, and
// the sign-in page keeps it once she is signed out. The first paint from
// the cookie is src/app/layout-first-paint.test.tsx's to check.
import { NextRequest } from "next/server";
import { describe, expect, test } from "vitest";
import { proxy } from "@/proxy.ts";
import {
  requestWithSession,
  signIn,
  signOut,
} from "@/test-database/session-test-kit.ts";
import { testUser } from "@/test-database/user-test-kit.ts";
import {
  fontPreloads,
  themeFontUrls,
} from "@/themes/font-preloads-test-kit.ts";
import { saveThemeChoiceAction } from "@/themes/save-theme-choice-action.ts";
import { DEFAULT_THEME_CHOICE, THEMES, type ThemeId } from "@/themes/themes.ts";

const SITE = "http://localhost";

// A theme other than the default, so a choice that wasn't saved shows.
const OTHER_THEME: ThemeId =
  THEMES.find(({ id }) => id !== DEFAULT_THEME_CHOICE.theme)?.id ??
  DEFAULT_THEME_CHOICE.theme;

// The proxy's response to a request for path from this browser, with its
// cookies.
function visit(path: string): Promise<Response> {
  return proxy(new NextRequest(requestWithSession(`${SITE}${path}`)));
}

describe("use_case_choose_theme", () => {
  test("a signed-in user's choice is saved, and the sign-in page keeps it once she signs out", async () => {
    await signIn(await testUser());

    await saveThemeChoiceAction({ theme: OTHER_THEME, mode: "dark" });

    expect(fontPreloads(await visit("/projects"))).toEqual(
      themeFontUrls(OTHER_THEME),
    );

    signOut();

    expect((await visit("/projects")).headers.get("location")).toBe(
      `${SITE}/login`,
    );
    expect(fontPreloads(await visit("/login"))).toEqual(
      themeFontUrls(OTHER_THEME),
    );
  });
});
