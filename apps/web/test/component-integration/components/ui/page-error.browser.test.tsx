// A page that fails while rendering reaches the browser as a bare document
// without <head>'s pre-paint scripts, and React renders <html> with the
// default theme attributes. PageError applies the saved mode itself, so the error page looks like every other page.
import { afterEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { PageError } from "@/components/ui/page-error.tsx";
import { userMessage } from "@/errors/app-error.ts";
import {
  DEFAULT_THEME_ATTRIBUTES,
  MODE_ATTRIBUTE,
  THEME_ATTRIBUTE,
} from "@/themes/theme-choice.ts";
import { PROBLEMS_COPY } from "@/ui/copy/problems.ts";
import { applyTheme } from "../../themes/theme-test-kit.ts";

// The browser's cookies when Dark is saved, beside a stale cookie from the
// removed Extras switches, which must hide nothing.
const SAVED_COOKIES = "theme=parchment.dark; hidden-extras=page-decorations";

const FAILURE = Object.assign(new Error("failed"), { digest: "unknown" });

function noRetry(): void {
  // The tests never retry.
}

function renderErrorPage(cookies: string): ReturnType<typeof render> {
  vi.spyOn(Document.prototype, "cookie", "get").mockReturnValue(cookies);
  applyTheme(DEFAULT_THEME_ATTRIBUTES[THEME_ATTRIBUTE]);
  return render(<PageError error={FAILURE} retry={noRetry} />);
}

afterEach(() => {
  vi.restoreAllMocks();
});

// A component test has no route announcer, so the page's alert is the only
// one.
describe("the error page's message", () => {
  test("an unrecognised failure says something went wrong only once", async () => {
    await render(<PageError error={FAILURE} retry={noRetry} />);
    await expect
      .element(page.getByRole("heading", { level: 1 }))
      .toHaveTextContent(PROBLEMS_COPY.errorHeading);
    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent(PROBLEMS_COPY.unknownError);
    expect(
      page.getByText(PROBLEMS_COPY.errorHeading, { exact: false }).elements(),
    ).toHaveLength(1);
  });

  test("a recognised failure says what went wrong", async () => {
    const failure = Object.assign(new Error("failed"), {
      digest: "database-unreachable",
    });
    await render(<PageError error={failure} retry={noRetry} />);
    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent(userMessage("database-unreachable"));
  });
});

describe("use_case_choose_theme", () => {
  test("an error page keeps the saved mode and hides nothing", async () => {
    await renderErrorPage(SAVED_COOKIES);

    const root = document.documentElement;
    expect(root.getAttribute(THEME_ATTRIBUTE)).toBe("parchment");
    expect(root.getAttribute(MODE_ATTRIBUTE)).toBe("dark");
    expect(root.hasAttribute("data-hide")).toBe(false);
  });

  test("an error page keeps the defaults when nothing is saved", async () => {
    await renderErrorPage("");

    const root = document.documentElement;
    expect(root.getAttribute(MODE_ATTRIBUTE)).toBe(
      DEFAULT_THEME_ATTRIBUTES[MODE_ATTRIBUTE],
    );
  });
});
