// "use_case_read_formatted_reply" in use-cases/performances.md, in Chromium
// and WebKit: a saved performance whose reply has a heading, emphasis,
// lists, a table, a manual link and a Python block, after a message the
// user typed with Markdown in it. Saving the reply is use_case_send_message's
// to check, and the server tests'. The site's stylesheet comes from
// vitest.browser-setup.ts.

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { getConstruct } from "@/constructs/index.ts";
import { PERFORMANCE_COPY } from "@/ui/copy/performances.ts";
import { questIdFixture, userIdFixture } from "../../support/id-fixtures.ts";
import {
  MARKDOWN_REPLY,
  PERFORMANCE,
  PERFORMANCE_ID,
  performanceView,
  sentMessage,
} from "../performances/performance-test-kit.tsx";
import { applyTheme } from "../themes/theme-test-kit.ts";
import { measureTargets, smallTargets } from "../touch-targets-test-kit.ts";
import {
  LAPTOP_VIEWPORT,
  NARROWEST_VIEWPORT,
  setViewport,
} from "../viewports-test-kit.ts";
import { loadCodeHighlighting } from "./code-highlighting-test-kit.ts";

vi.mock("next/navigation", () => import("./router-test-kit.ts"));

const QUEST_ID = questIdFixture();
const VIEWER = userIdFixture();
const CONSTRUCT = getConstruct("lumen");
const AUTHOR = "Robin";
const TYPED = "I typed **this** myself";
const RAW_MARKDOWN = /\*\*|^#|`/mu;
const BOLD = "600";
// How long the reply's code takes to show its colours once Python's
// highlighter is ready, which beforeAll awaits with no clock: Streamdown's
// lazy code-block chunk, one tokenising pass and one React commit, none of
// which the app marks with an event. Over 3 times the worst measured for
// the view this transcript replaced (1192 ms, under heavy load), and under
// the browser test timeout.
const HIGHLIGHTED_RENDER_TIMEOUT_MS = 4000;
const CODE_COLORED: Parameters<typeof expect.poll>[1] = {
  message: "Python is colored by its syntax",
  timeout: HIGHLIGHTED_RENDER_TIMEOUT_MS,
};
const ENTRY = sentMessage(TYPED, MARKDOWN_REPLY, AUTHOR);

// The saved message and its reply.
const entry = page.getByRole("listitem").filter({
  has: page.getByRole("heading", { level: 4, name: "Beveling an edge" }),
});

function codeColorCount(): number {
  return new Set(
    Array.from(
      entry.element().querySelectorAll("code span"),
      (span) => getComputedStyle(span).color,
    ),
  ).size;
}

function box(locator: { element: () => Element }): DOMRect {
  return locator.element().getBoundingClientRect();
}

// The entry's text other than the message: its author, the construct's
// name and the reply.
function replyText(): string {
  return entry.element().textContent.replace(TYPED, "");
}

async function openPerformance(
  viewer = VIEWER,
  performance = PERFORMANCE,
): Promise<Awaited<ReturnType<typeof render>>> {
  const screen = await render(
    performanceView({
      performance,
      questId: QUEST_ID,
      viewer,
      construct: CONSTRUCT,
      entries: [ENTRY],
      author: AUTHOR,
    }),
  );
  // The test's checks follow once the saved reply shows.
  await vi.waitFor(() => entry.element());
  return screen;
}

beforeAll(async () => {
  await loadCodeHighlighting("python");
});

beforeEach(() => {
  applyTheme("parchment", "dark");
});

afterEach(async () => {
  await setViewport(LAPTOP_VIEWPORT);
});

describe("use_case_read_formatted_reply", () => {
  test("headings, emphasis, lists, tables and code are formatted, and the message is as typed", async () => {
    await openPerformance();
    await expect
      .element(entry.getByRole("emphasis"))
      .toHaveTextContent("rounds");
    await expect
      .element(
        entry
          .getByRole("listitem")
          .filter({ hasText: "Press" })
          .getByText("Ctrl+B"),
      )
      .toHaveStyle({ fontWeight: BOLD });
    expect(entry.element().querySelectorAll("ol > li")).toHaveLength(2);
    expect(entry.element().querySelectorAll("ul > li")).toHaveLength(2);
    await expect
      .element(entry.getByRole("cell", { name: "Bevel" }))
      .toBeVisible();
    await expect.poll(codeColorCount, CODE_COLORED).toBeGreaterThan(1);
    expect(entry.element().querySelector("code")?.textContent).toContain(
      "import bpy",
    );
    // The reply shows no raw marks; the message shows them as typed.
    expect(replyText()).not.toMatch(RAW_MARKDOWN);
    await expect.element(entry.getByText(TYPED, { exact: true })).toBeVisible();
  });

  for (const viewport of [LAPTOP_VIEWPORT, NARROWEST_VIEWPORT]) {
    test(`at ${viewport.width} px, names come before performanceMessages, the portrait above the reply, and the composer's targets are usable`, async () => {
      await setViewport(viewport);
      await openPerformance();
      await expect.poll(codeColorCount, CODE_COLORED).toBeGreaterThan(1);
      const name = entry.getByText(AUTHOR, { exact: true });
      const typed = entry.getByText(TYPED, { exact: true });
      expect(box(name).bottom).toBeLessThanOrEqual(box(typed).top);
      const portrait = entry.getByRole("img", { name: CONSTRUCT.name });
      expect(box(typed).bottom).toBeLessThanOrEqual(box(portrait).top);
      expect(box(portrait).bottom).toBeLessThanOrEqual(
        box(entry.getByRole("heading", { level: 4 })).top,
      );
      // The reply's text starts where the message's does, not indented
      // past the portrait.
      expect(
        box(entry.getByRole("paragraph").filter({ hasText: "hard edge" })).left,
      ).toBe(box(typed).left);
      // With a draft, every composer button can be used.
      await page
        .getByRole("textbox", { name: PERFORMANCE_COPY.message })
        .fill("And the next edge?");
      expect(smallTargets(await measureTargets())).toEqual([]);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
        viewport.width,
      );
    });
  }

  test("an unsent draft stays in this browser for the viewer and performance until sent", async () => {
    const first = await openPerformance();
    const composer = page.getByRole("textbox", {
      name: PERFORMANCE_COPY.message,
    });
    await composer.fill("Half a thought");

    // Reopened, the draft is back, and the reply looks the same.
    await first.unmount();
    const second = await openPerformance();
    await expect.element(composer).toHaveValue("Half a thought");
    expect(replyText()).not.toMatch(RAW_MARKDOWN);

    // Another viewer in this browser, and another performance, start with
    // an empty composer.
    await second.unmount();
    const third = await openPerformance(userIdFixture());
    await expect.element(composer).toHaveValue("");
    await third.unmount();
    await openPerformance(VIEWER, {
      ...PERFORMANCE,
      id: PERFORMANCE_ID.parse(crypto.randomUUID()),
    });
    await expect.element(composer).toHaveValue("");
  });
});
