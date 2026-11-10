// A page whose notFound() runs while rendering, such as Invitations for an
// ordinary user, reaches the browser without <head>'s pre-paint scripts,
// and React renders <html> with the default theme attributes. The
// not-found page applies the saved mode and hidden extras itself, so it
// looks like every other page.
import { afterEach, describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import NotFound from "@/app/not-found.tsx";
import {
  DEFAULT_FLAG_ATTRIBUTES,
  HIDE_ATTRIBUTE,
} from "@/flags/flag-choice.ts";
import {
  DEFAULT_THEME_ATTRIBUTES,
  MODE_ATTRIBUTE,
  THEME_ATTRIBUTE,
} from "@/themes/theme-choice.ts";
import { applyTheme } from "../themes/theme-test-kit.ts";

// The browser's cookies when Dark and hidden page decorations are saved.
const SAVED_COOKIES = "theme=parchment.dark; hidden-extras=page-decorations";

afterEach(() => {
  vi.restoreAllMocks();
  document.documentElement.setAttribute(
    HIDE_ATTRIBUTE,
    DEFAULT_FLAG_ATTRIBUTES[HIDE_ATTRIBUTE],
  );
});

describe("use_case_choose_theme", () => {
  test("a page that isn't found keeps the saved mode and hidden extras", async () => {
    vi.spyOn(Document.prototype, "cookie", "get").mockReturnValue(
      SAVED_COOKIES,
    );
    applyTheme(DEFAULT_THEME_ATTRIBUTES[THEME_ATTRIBUTE]);
    await render(<NotFound />);

    const root = document.documentElement;
    expect(root.getAttribute(MODE_ATTRIBUTE)).toBe("dark");
    expect(root.getAttribute(HIDE_ATTRIBUTE)).toBe("page-decorations");
  });
});
