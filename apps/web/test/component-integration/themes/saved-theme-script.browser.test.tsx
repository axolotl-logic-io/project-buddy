// The script a streamed page's <head> runs before its first paint applies
// the saved appearance to <html> as a complete page renders it
// (theme-layout.server.test.ts): an unknown theme or mode keeps the default.
import { afterEach, expect, test, vi } from "vitest";
import {
  DEFAULT_THEME_ATTRIBUTES,
  MODE_ATTRIBUTE,
  readAppliedMode,
  readAppliedTheme,
  SAVED_THEME_SCRIPT,
  THEME_ATTRIBUTE,
  THEME_COOKIE_NAME,
} from "@/themes/theme-choice.ts";
import "./theme-test-kit.ts";

// Runs the script as the page's HTML would, on <html> in the default
// appearance, with the cookie value saved among others.
function runScript(saved: string | undefined): void {
  const root = document.documentElement;
  root.setAttribute(THEME_ATTRIBUTE, DEFAULT_THEME_ATTRIBUTES[THEME_ATTRIBUTE]);
  root.setAttribute(MODE_ATTRIBUTE, DEFAULT_THEME_ATTRIBUTES[MODE_ATTRIBUTE]);
  const cookies = ["session=abc"];
  if (saved !== undefined) {
    cookies.push(`${THEME_COOKIE_NAME}=${saved}`, "after=1");
  }
  vi.spyOn(Document.prototype, "cookie", "get").mockReturnValue(
    cookies.join("; "),
  );
  const script = document.createElement("script");
  script.textContent = SAVED_THEME_SCRIPT;
  document.head.append(script);
  script.remove();
}

afterEach(() => {
  vi.restoreAllMocks();
});

test.each([
  { saved: undefined, mode: "light" },
  { saved: "parchment.light", mode: "light" },
  { saved: "parchment.dark", mode: "dark" },
  { saved: "parchment.soot-brass", mode: "soot-brass" },
  { saved: "parchment.system", mode: "light" },
  { saved: "unknown.unknown", mode: "light" },
  { saved: "gravy-falls.dark", mode: "dark" },
])("applies $saved before the first paint", ({ saved, mode }) => {
  runScript(saved);
  expect(readAppliedTheme()).toBe("parchment");
  expect(readAppliedMode()).toBe(mode);
});
