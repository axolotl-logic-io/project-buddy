import { describe, expect, test } from "vitest";
import {
  type ComparedShot,
  comparisonPage,
  viewsWithoutMockup,
} from "../../../../scripts/visual/index-page.ts";
import {
  parseToolOptions,
  takesView,
} from "../../../../scripts/visual/options.ts";
import { layoutOf, VIEWS, viewName } from "../../../../scripts/visual/views.ts";

const DESKTOP = 1280;
const BRIEF_PHONE = 360;
const SMALL_PHONE = 320;
const VIEW_NAME = /^[a-z-]+--[a-z-]+$/u;
const WIDTHS_ERROR = /--widths/u;
const APPEARANCES_ERROR = /--appearances/u;
const BOTH_ERROR = /not both/u;

function shot(name: string, mockup: string | undefined): ComparedShot {
  return {
    name,
    account: "typical",
    appearance: "light",
    width: DESKTOP,
    app: `site/${name}--light--1280.png`,
    mockup,
    problems: [],
  };
}

describe("visual views", () => {
  test("every view has its own view--state name", () => {
    const names = VIEWS.map(viewName);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) {
      expect(name).toMatch(VIEW_NAME);
    }
  });

  test("phones are narrower than the desktop layout", () => {
    expect(layoutOf(SMALL_PHONE)).toBe("phone");
    expect(layoutOf(BRIEF_PHONE)).toBe("phone");
    expect(layoutOf(DESKTOP)).toBe("desktop");
  });
});

describe("visual tool options", () => {
  test("default to a production build at the brief's widths", () => {
    const options = parseToolOptions([], "/tmp/out");
    expect(options.site).toStrictEqual({ kind: "start", build: true });
    expect(options.widths).toStrictEqual([DESKTOP, BRIEF_PHONE]);
    expect(options.appearances).toStrictEqual(["light", "soot-brass", "dark"]);
    expect(options.out).toBe("/tmp/out");
  });

  test("take the development server, widths and a part of view names", () => {
    const options = parseToolOptions(
      ["--dev", "--widths", "1280,320", "--only", "quest--,settings"],
      "/tmp/out",
    );
    expect(options.site).toStrictEqual({ kind: "dev" });
    expect(options.widths).toStrictEqual([DESKTOP, SMALL_PHONE]);
    expect(takesView(options, "quest--conversation")).toBe(true);
    expect(takesView(options, "settings--default")).toBe(true);
    expect(takesView(options, "quests--list")).toBe(false);
  });

  test("refuse widths and appearances that don't exist", () => {
    expect(() => parseToolOptions(["--widths", "wide"], "/tmp")).toThrow(
      WIDTHS_ERROR,
    );
    expect(() => parseToolOptions(["--appearances", "neon"], "/tmp")).toThrow(
      APPEARANCES_ERROR,
    );
    expect(() =>
      parseToolOptions(["--dev", "--site", "http://localhost:3000"], "/tmp"),
    ).toThrow(BOTH_ERROR);
  });
});

describe("comparison page", () => {
  test("flags the views with no mockup", () => {
    const shots = [
      shot("quests--list", "mockups/quests--list--light--1280.png"),
      shot("quest--tasks", undefined),
    ];
    expect(viewsWithoutMockup(shots)).toStrictEqual(["quest--tasks"]);
    const page = comparisonPage({
      shots,
      mockups: { folder: "/mockups", unused: ["old--view"] },
      site: "http://localhost:3000 (production)",
      takenAt: "2026-11-17T00:00:00.000Z",
    });
    expect(page).toContain("1 views have no mockup");
    expect(page).toContain("<li>quest--tasks</li>");
    expect(page).toContain("<li>old--view</li>");
    expect(page).toContain('src="mockups/quests--list--light--1280.png"');
  });

  test("escapes what it shows", () => {
    const page = comparisonPage({
      shots: [{ ...shot("a--b", undefined), problems: ["<script>"] }],
      mockups: undefined,
      site: "here",
      takenAt: "now",
    });
    expect(page).toContain("&lt;script&gt;");
    // Only the page's own filter script.
    expect(page.split("<script>")).toHaveLength(2);
  });
});
