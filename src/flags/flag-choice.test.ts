import {
  afterEach,
  beforeEach,
  describe,
  expect,
  type Mock,
  test,
  vi,
} from "vitest";
import {
  DEFAULT_FLAG_ATTRIBUTES,
  FLAGS_PRE_PAINT_SCRIPT,
  HIDE_ATTRIBUTE,
  hiddenFlagsCookie,
  hiddenFlagsIn,
  readAppliedHide,
  subscribeToFlags,
  switchFlag,
} from "@/flags/flag-choice.ts";

const MS_PER_DAY = 86_400_000;
const DAYS_PER_YEAR = 365;
// How long the test may take between switching and checking the expiry.
const EXPIRY_TOLERANCE_MS = 60_000;

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

function savedCookie(): Mock<(options: CookieInit) => Promise<void>> {
  const set = vi.fn<(options: CookieInit) => Promise<void>>(() =>
    Promise.resolve(),
  );
  vi.stubGlobal("cookieStore", { set });
  return set;
}

beforeEach(resetRoot);

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
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

describe("switchFlag", () => {
  test("hides an extra at once and saves the choice for a year", () => {
    const set = savedCookie();

    switchFlag("tool-lines", false);
    switchFlag("working-notes", false);

    expect(appliedHide()).toBe("working-notes tool-lines");
    expect(set).toHaveBeenLastCalledWith({
      ...hiddenFlagsCookie(["working-notes", "tool-lines"]),
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

  test("shows a hidden extra again, and saves that too", () => {
    const set = savedCookie();
    switchFlag("chat-names", false);

    switchFlag("chat-names", true);
    switchFlag("chat-names", true);

    expect(appliedHide()).toBe("");
    expect(set).toHaveBeenLastCalledWith(
      expect.objectContaining(hiddenFlagsCookie([])),
    );
  });

  test("still applies when the cookie can't be saved", async () => {
    const set = vi.fn(() => Promise.reject(new Error("blocked")));
    vi.stubGlobal("cookieStore", { set });

    switchFlag("working-notes", false);
    await Promise.resolve();

    expect(set).toHaveBeenCalled();
    expect(appliedHide()).toBe("working-notes");
  });

  test("still applies without the Cookie Store API", () => {
    expect("cookieStore" in globalThis).toBe(false);

    switchFlag("page-decorations", false);

    expect(appliedHide()).toBe("page-decorations");
  });
});

describe("hiddenFlagsIn and readAppliedHide", () => {
  test("read the flags the page hides", () => {
    switchFlag("page-decorations", false);

    expect(hiddenFlagsIn(readAppliedHide())).toEqual(["page-decorations"]);
    expect(hiddenFlagsIn(null)).toEqual([]);
    expect(hiddenFlagsIn("no-such-flag  tool-lines")).toEqual(["tool-lines"]);
  });
});

describe("subscribeToFlags", () => {
  test("tells the subscriber when the hidden flags change, until it stops", async () => {
    const onChange = vi.fn();
    const stop = subscribeToFlags(onChange);

    switchFlag("working-notes", false);
    await vi.waitFor(() => {
      expect(onChange).toHaveBeenCalledTimes(1);
    });
    stop();
    switchFlag("working-notes", true);
    await Promise.resolve();

    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
