import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  applyHiddenFlags,
  DEFAULT_FLAG_ATTRIBUTES,
  FLAGS_PRE_PAINT_SCRIPT,
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

describe("FLAGS_PRE_PAINT_SCRIPT", () => {
  test("hides the flags the saved cookie names", () => {
    const { name, value } = hiddenFlagsCookie(["working-notes", "tool-lines"]);

    runPrePaintScript(`session=abc; ${name}=${value}; theme=gravy-falls.dark`);

    expect(appliedHide()).toBe("working-notes tool-lines");
  });

  test("without a saved cookie, the page keeps the default", () => {
    runPrePaintScript("session=abc; theme=gravy-falls.dark");

    expect(appliedHide()).toBe("persona-mechanics interview-persona");
  });

  test("a saved cookie that names nothing keeps every default, so the buddy mechanics stay hidden", () => {
    document.documentElement.setAttribute("data-hide", "working-notes");

    runPrePaintScript("hidden-extras=");

    expect(appliedHide()).toBe("persona-mechanics interview-persona");
  });

  test("a saved cookie that names the buddy mechanics shows them, and hides only the interview buddy", () => {
    runPrePaintScript("hidden-extras=persona-mechanics");

    expect(appliedHide()).toBe("interview-persona");
  });

  test("a saved cookie that names an extra shown by default hides it, beside the buddy mechanics", () => {
    runPrePaintScript("hidden-extras=working-notes");

    expect(appliedHide()).toBe(
      "working-notes persona-mechanics interview-persona",
    );
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

    expect(appliedHide()).toBe(
      "working-notes tool-lines persona-mechanics interview-persona",
    );
  });
});

describe("hiddenFlagsCookie", () => {
  test("keeps the ids of the flags switched from their default for a year, on every page, readable by the pre-paint script", () => {
    expect(hiddenFlagsCookie(["working-notes", "tool-lines"])).toEqual({
      name: "hidden-extras",
      value: "working-notes.tool-lines.persona-mechanics.interview-persona",
      path: "/",
      sameSite: "lax",
      maxAge: DAYS_PER_YEAR * SECONDS_PER_DAY,
    });
    expect(hiddenFlagsCookie([])).toHaveProperty(
      "value",
      "persona-mechanics.interview-persona",
    );
    expect(hiddenFlagsCookie(["persona-mechanics"])).toHaveProperty(
      "value",
      "interview-persona",
    );
    expect(
      hiddenFlagsCookie(["persona-mechanics", "interview-persona"]),
    ).toHaveProperty("value", "");
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
