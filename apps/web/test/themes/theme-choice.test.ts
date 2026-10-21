import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  DEFAULT_THEME_ATTRIBUTES,
  parseThemeChoiceCookie,
  THEME_PRE_PAINT_SCRIPT,
  themeChoiceCookie,
  themeChoiceSetCookie,
} from "@/themes/theme-choice.ts";

// 365 days, in seconds.
const ONE_YEAR_S = 31_536_000;

function resetRoot(): void {
  const root = document.documentElement;
  for (const [name, value] of Object.entries(DEFAULT_THEME_ATTRIBUTES)) {
    root.setAttribute(name, value);
  }
}

function rootAttributes(): { theme: string | null; mode: string | null } {
  const root = document.documentElement;
  return {
    theme: root.getAttribute("data-theme"),
    mode: root.getAttribute("data-mode"),
  };
}

// Runs the pre-paint script as the browser would, with these cookies.
function runPrePaintScript(cookies: string): void {
  vi.spyOn(Document.prototype, "cookie", "get").mockReturnValue(cookies);
  const script = document.createElement("script");
  script.textContent = THEME_PRE_PAINT_SCRIPT;
  document.head.append(script);
  script.remove();
}

beforeEach(resetRoot);

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("THEME_PRE_PAINT_SCRIPT", () => {
  test("applies a choice saved in themeChoiceCookie's form", () => {
    const cookie = themeChoiceCookie({ theme: "ay-liens", mode: "dark" });
    runPrePaintScript(`session=abc; ${cookie.name}=${cookie.value}`);

    expect(rootAttributes()).toEqual({ theme: "ay-liens", mode: "dark" });
  });
});

describe("themeChoiceSetCookie", () => {
  test("keeps the choice for a year on every path, readable by the pre-paint script", () => {
    const cookie = themeChoiceSetCookie({ theme: "ay-liens", mode: "dark" });

    expect(cookie).toEqual({
      name: "theme",
      value: "ay-liens.dark",
      path: "/",
      sameSite: "lax",
      maxAge: ONE_YEAR_S,
    });
    expect(cookie).not.toHaveProperty("httpOnly");
    expect(cookie).not.toHaveProperty("secure");
  });

  test("leaves themeChoiceCookie as just a name and value, for Playwright", () => {
    expect(themeChoiceCookie({ theme: "ay-liens", mode: "dark" })).toEqual({
      name: "theme",
      value: "ay-liens.dark",
    });
  });
});

describe("parseThemeChoiceCookie", () => {
  test.each([
    ["no cookie", undefined, { theme: "gravy-falls", mode: "system" }],
    ["an empty value", "", { theme: "gravy-falls", mode: "system" }],
    [
      "a saved choice",
      "ghost-hasslers.dark",
      { theme: "ghost-hasslers", mode: "dark" },
    ],
    ["a theme alone", "ay-liens", { theme: "ay-liens", mode: "system" }],
    ["a bad mode", "ay-liens.purple", { theme: "ay-liens", mode: "system" }],
    ["an unknown theme", "nonsense", { theme: "gravy-falls", mode: "system" }],
    [
      "unknown theme with mode",
      "no-such-theme.light",
      { theme: "gravy-falls", mode: "light" },
    ],
    [
      "malformed value",
      "gravy falls",
      { theme: "gravy-falls", mode: "system" },
    ],
  ])("reads %s as the pre-paint script does", (_case, value, choice) => {
    expect(parseThemeChoiceCookie(value)).toEqual(choice);
    let cookies = "session=abc";
    if (value !== undefined) {
      cookies += `; theme=${value}`;
    }
    runPrePaintScript(cookies);
    expect(rootAttributes()).toEqual(choice);
  });
});
