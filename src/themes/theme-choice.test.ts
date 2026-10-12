import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  chooseMode,
  chooseTheme,
  DEFAULT_THEME_ATTRIBUTES,
  THEME_PRE_PAINT_SCRIPT,
  themeChoiceCookie,
} from "@/themes/theme-choice.ts";

const MS_PER_DAY = 86_400_000;
const DAYS_PER_YEAR = 365;
// How long the test may take between choosing and checking the expiry.
const EXPIRY_TOLERANCE_MS = 60_000;

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
  test("applies the saved theme and mode", () => {
    runPrePaintScript("session=abc; theme=gravy-falls.dark");

    expect(rootAttributes()).toEqual({ theme: "gravy-falls", mode: "dark" });
  });

  test("without a saved choice, the page keeps the default", () => {
    runPrePaintScript("session=abc");

    expect(rootAttributes()).toEqual({
      theme: "gravy-falls",
      mode: "system",
    });
  });

  test("an unknown theme keeps the default theme but applies the mode", () => {
    runPrePaintScript("theme=no-such-theme.light");

    expect(rootAttributes()).toEqual({ theme: "gravy-falls", mode: "light" });
  });

  test("applies a choice saved in themeChoiceCookie's form", () => {
    const cookie = themeChoiceCookie({ theme: "ay-liens", mode: "dark" });
    runPrePaintScript(`session=abc; ${cookie.name}=${cookie.value}`);

    expect(rootAttributes()).toEqual({ theme: "ay-liens", mode: "dark" });
  });

  test("a malformed value keeps the default", () => {
    runPrePaintScript("theme=gravy falls; other-theme=gravy-falls.dark");

    expect(rootAttributes()).toEqual({
      theme: "gravy-falls",
      mode: "system",
    });
  });
});

describe("chooseTheme and chooseMode", () => {
  test("restyle the page and save the choice for a year", () => {
    const set = vi.fn<(options: CookieInit) => Promise<void>>(() =>
      Promise.resolve(),
    );
    vi.stubGlobal("cookieStore", { set });

    chooseMode("dark");
    chooseTheme("gravy-falls");

    expect(rootAttributes()).toEqual({ theme: "gravy-falls", mode: "dark" });
    expect(set).toHaveBeenLastCalledWith({
      name: "theme",
      value: "gravy-falls.dark",
      path: "/",
      sameSite: "lax",
      expires: expect.any(Number),
    });
    const [options] = set.mock.lastCall ?? [];
    const yearFromNow = Date.now() + DAYS_PER_YEAR * MS_PER_DAY;
    expect(Math.abs(Number(options?.expires) - yearFromNow)).toBeLessThan(
      EXPIRY_TOLERANCE_MS,
    );
  });

  test("an unknown value applies the default", () => {
    vi.stubGlobal("cookieStore", { set: () => Promise.resolve() });
    chooseMode("light");

    chooseTheme("no-such-theme");
    chooseMode("dim");

    expect(rootAttributes()).toEqual({
      theme: "gravy-falls",
      mode: "system",
    });
  });

  test("still restyle the page when the cookie can't be saved", async () => {
    const set = vi.fn(() => Promise.reject(new Error("blocked")));
    vi.stubGlobal("cookieStore", { set });

    chooseMode("dark");
    await Promise.resolve();

    expect(set).toHaveBeenCalled();
    expect(rootAttributes().mode).toBe("dark");
  });

  test("still restyle the page without the Cookie Store API", () => {
    expect("cookieStore" in globalThis).toBe(false);

    chooseMode("light");

    expect(rootAttributes().mode).toBe("light");
  });
});
