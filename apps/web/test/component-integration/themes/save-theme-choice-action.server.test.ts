// use_case_choose_theme, saved: a signed-in user's choice is saved in this
// browser's cookie, so every later page preloads that theme's fonts, and
// the sign-in page keeps it once she is signed out. The first paint from
// the cookie is test/app/layout-first-paint.test.tsx's to check.
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { describe, expect, test } from "vitest";
import { proxy } from "@/proxy.ts";
import { saveThemeChoiceAction } from "@/themes/save-theme-choice-action.ts";
import {
  parseThemeChoiceCookie,
  THEME_COOKIE_NAME,
} from "@/themes/theme-choice.ts";
import { DEFAULT_THEME_CHOICE } from "@/themes/themes.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import {
  requestWithSession,
  signIn,
  signOut,
} from "../test-database/session-test-kit.ts";
import { fontPreloads, themeFontUrls } from "./font-preloads-test-kit.ts";

const SITE = "http://localhost";

// The proxy's response to a request for path from this browser, with its
// cookies.
function visit(path: string): Promise<Response> {
  return proxy(new NextRequest(requestWithSession(`${SITE}${path}`)));
}

describe("use_case_choose_theme", () => {
  test("a signed-in user's choice is saved, and the sign-in page keeps it once she signs out", async () => {
    await signIn(await testUser());

    await saveThemeChoiceAction({
      theme: DEFAULT_THEME_CHOICE.theme,
      mode: "dark",
    });

    expect(fontPreloads(await visit("/projects"))).toEqual(
      themeFontUrls(DEFAULT_THEME_CHOICE.theme),
    );

    signOut();

    expect(
      parseThemeChoiceCookie((await cookies()).get(THEME_COOKIE_NAME)?.value),
    ).toEqual({
      theme: DEFAULT_THEME_CHOICE.theme,
      mode: "dark",
    });

    expect((await visit("/projects")).headers.get("location")).toBe(
      `${SITE}/login`,
    );
    expect(fontPreloads(await visit("/login"))).toEqual(
      themeFontUrls(DEFAULT_THEME_CHOICE.theme),
    );
  });
});
