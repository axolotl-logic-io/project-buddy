import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import RootLayout from "@/app/layout.tsx";
import { proxy } from "@/proxy.ts";
import {
  parseThemeChoiceCookie,
  THEME_COOKIE_NAME,
} from "@/themes/theme-choice.ts";
import { DEFAULT_THEME_CHOICE, THEME_MODES } from "@/themes/themes.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import {
  requestWithSession,
  signIn,
  signOut,
} from "../test-database/session-test-kit.ts";
import { fontPreloads, themeFontUrls } from "./font-preloads-test-kit.ts";

vi.mock("next/font/local", () => ({
  default: (): { variable: string } => ({ variable: "" }),
}));

const SITE = "http://localhost";

// The proxy's response to a request for path from this browser, with its
// cookies.
function visit(path: string): Promise<Response> {
  return proxy(new NextRequest(requestWithSession(`${SITE}${path}`)));
}

describe("use_case_choose_theme", () => {
  test.each(THEME_MODES)("the %s choice survives signing out", async (mode) => {
    await signIn(await testUser());

    (await cookies()).set({
      name: THEME_COOKIE_NAME,
      value: `parchment.${mode}`,
    });

    expect(fontPreloads(await visit("/quests"))).toEqual(
      themeFontUrls(DEFAULT_THEME_CHOICE.theme),
    );

    signOut();

    expect(
      parseThemeChoiceCookie((await cookies()).get(THEME_COOKIE_NAME)?.value),
    ).toEqual({
      theme: DEFAULT_THEME_CHOICE.theme,
      mode,
    });

    expect((await visit("/quests")).headers.get("location")).toBe(
      `${SITE}/login`,
    );
    const html = await pageHtml();
    expect(html).toContain(`data-mode="${mode}"`);
    expect(fontPreloads(await visit("/login"))).toEqual(
      themeFontUrls(DEFAULT_THEME_CHOICE.theme),
    );
  });
});

async function pageHtml(): Promise<string> {
  const layout = await RootLayout({
    params: Promise.resolve({}),
    header: createElement("header"),
    children: createElement("p"),
  });
  return renderToStaticMarkup(layout);
}

test.each([
  { value: undefined, mode: "light" },
  { value: "parchment.light", mode: "light" },
  { value: "parchment.dark", mode: "dark" },
  { value: "parchment.soot-brass", mode: "soot-brass" },
  { value: "parchment.system", mode: "light" },
  { value: "unknown.unknown", mode: "light" },
  { value: "gravy-falls.dark", mode: "dark" },
  { value: "ghost-hasslers.dark", mode: "dark" },
  { value: "ay-liens.dark", mode: "dark" },
])("renders $value in the initial HTML", async ({ value, mode }) => {
  if (value !== undefined) {
    (await cookies()).set({ name: THEME_COOKIE_NAME, value });
  }
  expect(await pageHtml()).toMatch(
    `<html data-theme="parchment" data-mode="${mode}"`,
  );
});
