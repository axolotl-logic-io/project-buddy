import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  applyHiddenFlags,
  DEFAULT_FLAG_ATTRIBUTES,
  FLAGS_PRE_PAINT_SCRIPT,
  HIDE_ATTRIBUTE,
  hiddenFlagsCookie,
  hiddenFlagsIn,
  readAppliedHide,
  subscribeToFlags,
} from "@/flags/flag-choice.ts";

const SECONDS_PER_DAY = 86_400;
const DAYS_PER_YEAR = 365;

function resetRoot(): void {
  for (const [name, value] of Object.entries(DEFAULT_FLAG_ATTRIBUTES)) {
    document.documentElement.setAttribute(name, value);
  }
}

function appliedHide(): string | null {
  return document.documentElement.getAttribute("data-hide");
}

// Runs the pre-paint script as the browser would, with these cookies.
function runPrePaintScript(cookies: string): void {
  vi.spyOn(Document.prototype, "cookie", "get").mockReturnValue(cookies);
  const script = document.createElement("script");
  script.textContent = FLAGS_PRE_PAINT_SCRIPT;
  document.head.append(script);
  script.remove();
}

beforeEach(resetRoot);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DEFAULT_FLAG_ATTRIBUTES", () => {
  test("hide nothing", () => {
    expect(DEFAULT_FLAG_ATTRIBUTES).toEqual({ "data-hide": "" });
    expect(HIDE_ATTRIBUTE).toBe("data-hide");
  });
});

describe("FLAGS_PRE_PAINT_SCRIPT", () => {
  test("hides the flags the saved cookie names", () => {
    const { name, value } = hiddenFlagsCookie(["working-notes", "tool-lines"]);

    runPrePaintScript(`session=abc; ${name}=${value}; theme=gravy-falls.dark`);

    expect(appliedHide()).toBe("working-notes tool-lines");
  });

  test("without a saved cookie, the page keeps the default", () => {
    runPrePaintScript("session=abc; theme=gravy-falls.dark");

    expect(appliedHide()).toBe("");
  });

  test("a saved cookie that hides nothing shows every extra", () => {
    document.documentElement.setAttribute("data-hide", "working-notes");
    const { name, value } = hiddenFlagsCookie([]);

    runPrePaintScript(`${name}=${value}`);

    expect(appliedHide()).toBe("");
  });

  test("leaves out unknown flags and repeats, in the registry's order", () => {
    const { name } = hiddenFlagsCookie([]);

    runPrePaintScript(
      `${name}=tool-lines.no-such-flag.working-notes.tool-lines.working notes`,
    );

    expect(appliedHide()).toBe("working-notes tool-lines");
  });
});

describe("hiddenFlagsCookie", () => {
  test("keeps the hidden flags' ids for a year, on every page, readable by the pre-paint script", () => {
    expect(hiddenFlagsCookie(["working-notes", "tool-lines"])).toEqual({
      name: "hidden-extras",
      value: "working-notes.tool-lines",
      path: "/",
      sameSite: "lax",
      maxAge: DAYS_PER_YEAR * SECONDS_PER_DAY,
    });
    expect(hiddenFlagsCookie([])).toHaveProperty("value", "");
  });
});

describe("applyHiddenFlags", () => {
  test("hides exactly the flags given, at once", () => {
    applyHiddenFlags(["working-notes", "chat-names"]);
    expect(appliedHide()).toBe("working-notes chat-names");

    applyHiddenFlags([]);
    expect(appliedHide()).toBe("");
  });
});

describe("hiddenFlagsIn and readAppliedHide", () => {
  test("read the flags the page hides", () => {
    applyHiddenFlags(["page-decorations"]);

    expect(hiddenFlagsIn(readAppliedHide())).toEqual(["page-decorations"]);
    expect(hiddenFlagsIn(null)).toEqual([]);
    expect(hiddenFlagsIn("no-such-flag  tool-lines")).toEqual(["tool-lines"]);
  });
});

describe("subscribeToFlags", () => {
  test("tells the subscriber when the hidden flags change, until it stops", async () => {
    const onChange = vi.fn();
    const stop = subscribeToFlags(onChange);

    applyHiddenFlags(["working-notes"]);
    await vi.waitFor(() => {
      expect(onChange).toHaveBeenCalledTimes(1);
    });
    stop();
    applyHiddenFlags([]);
    await Promise.resolve();

    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
