// A page that fails while rendering reaches the browser as a bare document
// without <head>'s pre-paint scripts, and React renders <html> with the
// default theme attributes. PageError applies the saved mode and hidden
// extras itself, so the error page looks like every other page.
import { afterEach, describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { PageError } from "@/components/ui/page-error.tsx";
import {
  DEFAULT_FLAG_ATTRIBUTES,
  HIDE_ATTRIBUTE,
} from "@/flags/flag-choice.ts";
import {
  DEFAULT_THEME_ATTRIBUTES,
  MODE_ATTRIBUTE,
  THEME_ATTRIBUTE,
} from "@/themes/theme-choice.ts";
import { applyTheme } from "../../themes/theme-test-kit.ts";

// The browser's cookies when Dark and hidden page decorations are saved.
const SAVED_COOKIES = "theme=parchment.dark; hidden-extras=page-decorations";

const FAILURE = Object.assign(new Error("failed"), { digest: "unknown" });

function noRetry(): void {
  // The tests never retry.
}

function renderErrorPage(cookies: string): ReturnType<typeof render> {
  vi.spyOn(Document.prototype, "cookie", "get").mockReturnValue(cookies);
  applyTheme(DEFAULT_THEME_ATTRIBUTES[THEME_ATTRIBUTE]);
  document.documentElement.setAttribute(
    HIDE_ATTRIBUTE,
    DEFAULT_FLAG_ATTRIBUTES[HIDE_ATTRIBUTE],
  );
  return render(<PageError error={FAILURE} retry={noRetry} />);
}

afterEach(() => {
  vi.restoreAllMocks();
  document.documentElement.setAttribute(
    HIDE_ATTRIBUTE,
    DEFAULT_FLAG_ATTRIBUTES[HIDE_ATTRIBUTE],
  );
});

describe("use_case_choose_theme", () => {
  test("an error page keeps the saved mode and hidden extras", async () => {
    await renderErrorPage(SAVED_COOKIES);

    const root = document.documentElement;
    expect(root.getAttribute(THEME_ATTRIBUTE)).toBe("parchment");
    expect(root.getAttribute(MODE_ATTRIBUTE)).toBe("dark");
    expect(root.getAttribute(HIDE_ATTRIBUTE)).toBe("page-decorations");
  });

  test("an error page keeps the defaults when nothing is saved", async () => {
    await renderErrorPage("");

    const root = document.documentElement;
    expect(root.getAttribute(MODE_ATTRIBUTE)).toBe(
      DEFAULT_THEME_ATTRIBUTES[MODE_ATTRIBUTE],
    );
    expect(root.getAttribute(HIDE_ATTRIBUTE)).toBe(
      DEFAULT_FLAG_ATTRIBUTES[HIDE_ATTRIBUTE],
    );
  });
});
