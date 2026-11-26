// "use_case_follow_latest_messages" in use-cases/performances.md, in Chromium
// and WebKit: the active performance follows its newest message and
// reply while the user stays at the end, and keeps their place while they
// read earlier ones. No clock paces these tests: each waits for the
// browser's own frames and scroll events.

import { afterEach, describe, expect, onTestFinished, test, vi } from "vitest";
import { commands, page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { getConstruct } from "@/constructs/index.ts";
import { sendMessageAction } from "@/performances/performance-actions.ts";
import type { PerformanceMessage } from "@/performances/performance-store.ts";
import { PERFORMANCE_COPY } from "@/ui/copy/performances.ts";
import { questIdFixture, userIdFixture } from "../../support/id-fixtures.ts";
import {
  performanceView,
  sentMessage,
} from "../performances/performance-test-kit.tsx";
import {
  LAPTOP_VIEWPORT,
  PHONE_VIEWPORT,
  setViewport,
} from "../viewports-test-kit.ts";

vi.mock("next/navigation", () => import("./router-test-kit.ts"));

const QUEST_ID = questIdFixture();
const VIEWER = userIdFixture();
const LONG_TEXT = Array.from(
  { length: 50 },
  (_, index) => `Paragraph ${index}. An earlier part of the performance.`,
).join("\n\n");
const firstParagraph = page.getByText(
  "Paragraph 0. An earlier part of the performance.",
  { exact: true },
);
const VIEWPORT_STEP = 100;
const READING_STEP = 200;
const KEYBOARD_HEIGHT = 400;
// How far Firefox moved the visual viewport on a wheel step (Firefox 149).
const VIEWPORT_JITTER = -0.23;
const WHEEL_STEP = 120;
const TOUCH_START_Y = 200;
const TOUCH_MOVE_Y = 300;
const HISTORY: readonly PerformanceMessage[] = [
  sentMessage("Tell me everything", LONG_TEXT),
];

const composer = page.getByRole("textbox", {
  name: PERFORMANCE_COPY.message,
});

function bottomGap(): number {
  return (
    document.documentElement.scrollHeight - window.innerHeight - window.scrollY
  );
}

function view(entries: readonly PerformanceMessage[]): React.JSX.Element {
  return performanceView({
    questId: QUEST_ID,
    viewer: VIEWER,
    construct: getConstruct("vellum"),
    entries,
  });
}

async function openPerformance(
  entries: readonly PerformanceMessage[] = HISTORY,
): Promise<Awaited<ReturnType<typeof render>>> {
  const screen = await render(view(entries));
  await document.fonts.ready;
  await layoutSettled();
  return screen;
}

// The transcript's list of messages, where late content, such as a
// reply's laid-out code or images, grows the performance.
function transcript(): Element {
  return page.getByRole("list").first().element();
}

function grow(): void {
  transcript().append(
    Object.assign(document.createElement("div"), { textContent: LONG_TEXT }),
  );
}

// Cross both the render and resize-observer phases before checking that an
// incoming update did not move the reader. No clock or delay paces the test.
async function layoutSettled(): Promise<void> {
  await new Promise<number>(requestAnimationFrame);
  await new Promise<number>(requestAnimationFrame);
}

// WebKit emits scrollend during keyboard-scroll animation, not just after it.
// Measure preservation only once the browser's own navigation has stopped.
async function finishBrowserScroll(): Promise<void> {
  const before = window.scrollY;
  await layoutSettled();
  if (window.scrollY !== before) {
    await finishBrowserScroll();
  }
}

function scrolled(): Promise<void> {
  return new Promise<void>((resolve) => {
    window.addEventListener(
      "scroll",
      () => {
        resolve();
      },
      { once: true },
    );
  });
}

async function readEarlier(): Promise<number> {
  const y = Math.floor(window.scrollY / 2);
  const moved = scrolled();
  window.scrollTo({ top: y, behavior: "instant" });
  // Await the browser's scroll event before more content arrives.
  await moved;
  return window.scrollY;
}

// A visual viewport the test resizes, as a phone's keyboard does.
function stubVisualViewport(height: number): EventTarget & {
  height: number;
  offsetTop: number;
} {
  const viewport = Object.assign(new EventTarget(), { height, offsetTop: 0 });
  vi.stubGlobal("visualViewport", viewport);
  return viewport;
}

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.mocked(sendMessageAction).mockReset();
  await setViewport(LAPTOP_VIEWPORT);
});

describe("use_case_follow_latest_messages", () => {
  for (const size of [LAPTOP_VIEWPORT, PHONE_VIEWPORT]) {
    test(`opens at the latest reply, follows a message and its reply, and keeps an earlier reading place at ${size.width}px`, async () => {
      await setViewport(size);
      const reply = Promise.withResolvers<string | undefined>();
      vi.mocked(sendMessageAction).mockReturnValueOnce(reply.promise);
      const screen = await openPerformance();
      await expect.element(firstParagraph).toBeInTheDocument();
      await expect.poll(bottomGap).toBeLessThanOrEqual(1);
      expect(window.scrollY).toBeGreaterThan(0);

      // Sending a message from an earlier place brings the message into view.
      await composer.fill("Continue");
      await readEarlier();
      await page
        .getByRole("button", { name: PERFORMANCE_COPY.send, exact: true })
        .click();
      await expect
        .element(page.getByText("Continue", { exact: true }))
        .toBeVisible();
      await expect.poll(bottomGap).toBeLessThanOrEqual(1);

      // The reply arrives with the page's refresh, and comes into view.
      const answered = [
        ...HISTORY,
        sentMessage("Continue", `First reply.\n\n${LONG_TEXT}`),
      ];
      reply.resolve(undefined);
      await screen.rerender(view(answered));
      await expect
        .element(page.getByText("First reply.", { exact: true }))
        .toBeInTheDocument();
      await expect.poll(bottomGap).toBeLessThanOrEqual(1);

      // Reading earlier, a later reply doesn't move the reader.
      const readingY = await readEarlier();
      await screen.rerender(
        view([
          ...answered,
          sentMessage("More", `Second reply.\n\n${LONG_TEXT}`, "Sam"),
        ]),
      );
      await expect
        .element(page.getByText("Second reply.", { exact: true }))
        .toBeInTheDocument();
      await layoutSettled();
      expect(window.scrollY).toBe(readingY);

      // Back at the end, following resumes.
      const atEnd = scrolled();
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "instant",
      });
      await atEnd;
      grow();
      await layoutSettled();
      expect(bottomGap()).toBeLessThanOrEqual(1);
    });
  }

  test("content shrinking at the end keeps following later growth", async () => {
    await openPerformance();
    await expect.element(firstParagraph).toBeInTheDocument();
    await expect.poll(bottomGap).toBeLessThanOrEqual(1);
    await layoutSettled();
    const extra = Object.assign(document.createElement("div"), {
      textContent: LONG_TEXT,
    });
    transcript().append(extra);
    await layoutSettled();
    expect(bottomGap()).toBeLessThanOrEqual(1);
    const expandedY = window.scrollY;
    extra.remove();
    await layoutSettled();
    expect(window.scrollY).toBeLessThan(expandedY);
    expect(bottomGap()).toBeLessThanOrEqual(1);
    transcript().append(extra);
    await layoutSettled();
    expect(bottomGap()).toBeLessThanOrEqual(1);
  });

  test("content that shrinks and regrows before a frame keeps following", async () => {
    await openPerformance();
    await expect.element(firstParagraph).toBeInTheDocument();
    await expect.poll(bottomGap).toBeLessThanOrEqual(1);
    const extra = Object.assign(document.createElement("div"), {
      textContent: LONG_TEXT,
    });
    transcript().append(extra);
    await layoutSettled();
    expect(bottomGap()).toBeLessThanOrEqual(1);
    // A sent message gives way to its reply: the page shrinks, the browser
    // clamps the reader upward on a layout read, and the reply grows the
    // page again before the clamp's scroll event arrives.
    extra.remove();
    expect(bottomGap()).toBeLessThanOrEqual(1);
    grow();
    await layoutSettled();
    expect(bottomGap()).toBeLessThanOrEqual(1);
  });

  for (const keyboard of ["visual", "layout"]) {
    test(`composer focus keeps the reading place through ${keyboard} keyboard resizing and growth`, async () => {
      await setViewport(PHONE_VIEWPORT);
      await layoutSettled();
      const viewport = Object.assign(new EventTarget(), {
        height: PHONE_VIEWPORT.height,
        offsetTop: 0,
      });
      if (keyboard === "visual") {
        vi.stubGlobal("visualViewport", viewport);
      }
      await openPerformance();
      await expect.element(firstParagraph).toBeInTheDocument();
      await expect.poll(bottomGap).toBeLessThanOrEqual(1);
      await layoutSettled();
      const readingY = await readEarlier();
      composer.element().focus({ preventScroll: true });
      // The browser's own focus scrolling as the keyboard opens, before
      // the reading place is restored.
      function focusScroll(): void {
        window.scrollTo({ top: readingY + READING_STEP, behavior: "instant" });
      }
      if (keyboard === "visual") {
        viewport.height = KEYBOARD_HEIGHT;
        viewport.dispatchEvent(new Event("resize"));
        focusScroll();
      } else {
        window.addEventListener("resize", focusScroll, { once: true });
        await page.viewport(PHONE_VIEWPORT.width, KEYBOARD_HEIGHT);
      }
      await layoutSettled();
      expect(window.scrollY).toBe(readingY);
      grow();
      await layoutSettled();
      expect(window.scrollY).toBe(readingY);
      globalThis.dispatchEvent(new WheelEvent("wheel", { deltaY: WHEEL_STEP }));
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "instant",
      });
      await layoutSettled();
      grow();
      await layoutSettled();
      expect(bottomGap()).toBeLessThanOrEqual(1);
    });
  }

  test("upward input on a short performance doesn't stop later following", async () => {
    await openPerformance([]);
    await layoutSettled();
    expect(window.scrollY).toBe(0);
    globalThis.dispatchEvent(new WheelEvent("wheel", { deltaY: -WHEEL_STEP }));
    const growth = document.createElement("div");
    // Late media taller than the screen, even a wide one.
    growth.style.height = `${window.innerHeight * 2}px`;
    transcript().append(growth);
    await layoutSettled();
    expect(window.scrollY).toBeGreaterThan(0);
    expect(bottomGap()).toBeLessThanOrEqual(1);
  });

  for (const navigation of ["scrollbar", "link"]) {
    test(`${navigation} back to the end after composer focus resumes following`, async () => {
      await openPerformance();
      await expect.element(firstParagraph).toBeInTheDocument();
      await expect.poll(bottomGap).toBeLessThanOrEqual(1);
      await readEarlier();
      composer.element().focus({ preventScroll: true });
      if (navigation === "scrollbar") {
        document.documentElement.dispatchEvent(
          new PointerEvent("pointerdown", { bubbles: true }),
        );
      } else {
        const link = document.createElement("a");
        link.href = "#latest";
        document.body.append(link);
        link.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        link.remove();
      }
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "instant",
      });
      await layoutSettled();
      grow();
      await layoutSettled();
      expect(bottomGap()).toBeLessThanOrEqual(1);
    });
  }

  for (const input of ["wheel", "touch", "keyboard"]) {
    test(`${input} pauses following before its scroll event and a queued viewport update`, async () => {
      const viewport = stubVisualViewport(window.innerHeight);
      await openPerformance();
      await expect.element(firstParagraph).toBeInTheDocument();
      await expect.poll(bottomGap).toBeLessThanOrEqual(1);
      await layoutSettled();
      const y = window.scrollY;
      // Queue a keyboard restoration, then start upward navigation in the
      // same task, with no document scroll event yet.
      viewport.height -= VIEWPORT_STEP;
      viewport.dispatchEvent(new Event("resize"));
      if (input === "wheel") {
        globalThis.dispatchEvent(
          new WheelEvent("wheel", { deltaY: -WHEEL_STEP }),
        );
      } else if (input === "touch") {
        globalThis.dispatchEvent(
          Object.assign(new Event("touchstart"), {
            touches: [{ clientY: TOUCH_START_Y }],
          }),
        );
        globalThis.dispatchEvent(
          Object.assign(new Event("touchmove"), {
            touches: [{ clientY: TOUCH_MOVE_Y }],
          }),
        );
      } else {
        globalThis.dispatchEvent(
          new KeyboardEvent("keydown", { key: "PageUp" }),
        );
      }
      // Late growth while the gesture has begun but its scroll hasn't
      // arrived neither pulls the page down nor restores the old place.
      grow();
      await layoutSettled();
      expect(window.scrollY).toBe(y);
      const readingY = y - READING_STEP;
      window.scrollTo({ top: readingY, behavior: "instant" });
      viewport.height -= VIEWPORT_STEP;
      viewport.dispatchEvent(new Event("resize"));
      globalThis.dispatchEvent(
        new WheelEvent("wheel", { deltaY: -WHEEL_STEP }),
      );
      await layoutSettled();
      expect(window.scrollY).toBe(readingY);
    });
  }

  test("the browser's own PageUp survives growth and composer focus", async () => {
    await openPerformance();
    await expect.element(firstParagraph).toBeInTheDocument();
    await expect.poll(bottomGap).toBeLessThanOrEqual(1);
    await layoutSettled();
    const bottom = window.scrollY;
    const ended = new Promise<void>((resolve) => {
      window.addEventListener(
        "scrollend",
        () => {
          resolve();
        },
        { once: true },
      );
    });
    await userEvent.keyboard("{PageUp}");
    await ended;
    await finishBrowserScroll();
    await expect.poll(() => window.scrollY).toBeLessThan(bottom);
    await layoutSettled();
    const readingY = window.scrollY;
    grow();
    await layoutSettled();
    expect(window.scrollY).toBe(readingY);
    composer.element().focus();
    await layoutSettled();
    expect(window.scrollY).toBe(readingY);
  });

  test("the browser's own wheel survives growth and composer focus", async () => {
    // Recording tools can add a sibling iframe outside the test surface.
    const auxiliary = document.createElement("iframe");
    window.parent.document.body.append(auxiliary);
    onTestFinished(() => {
      auxiliary.remove();
    });
    await openPerformance();
    await expect.element(firstParagraph).toBeInTheDocument();
    await expect.poll(bottomGap).toBeLessThanOrEqual(1);
    await layoutSettled();
    const bottom = window.scrollY;
    const ended = new Promise<void>((resolve) => {
      window.addEventListener(
        "scrollend",
        () => {
          resolve();
        },
        { once: true },
      );
    });
    await commands.wheelUp();
    await ended;
    await expect.poll(() => window.scrollY).toBeLessThan(bottom);
    await layoutSettled();
    const readingY = window.scrollY;
    grow();
    await layoutSettled();
    // WebKit can carry on upward after scrollend between wheel segments.
    // The browser's own scrolling must not pull the reader down.
    expect(window.scrollY).toBeLessThanOrEqual(readingY);
    composer.element().focus();
    await layoutSettled();
    expect(window.scrollY).toBeLessThanOrEqual(readingY);
  });

  test("the phone keyboard keeps the composer above it, following at the end and keeping an earlier place", async () => {
    await setViewport(PHONE_VIEWPORT);
    await layoutSettled();
    await openPerformance();
    await expect.element(firstParagraph).toBeInTheDocument();
    await expect.poll(bottomGap).toBeLessThanOrEqual(1);
    expect(window.scrollY).toBeGreaterThan(0);
    await composer.click();
    await page.viewport(PHONE_VIEWPORT.width, KEYBOARD_HEIGHT);
    await expect.poll(bottomGap).toBeLessThanOrEqual(1);
    await expect.element(composer).toBeInViewport({ ratio: 1 });
    await page.viewport(PHONE_VIEWPORT.width, PHONE_VIEWPORT.height);
    await layoutSettled();
    await expect.poll(bottomGap).toBeLessThanOrEqual(1);
    grow();
    await layoutSettled();
    expect(bottomGap()).toBeLessThanOrEqual(1);
    const readingY = await readEarlier();
    await page.viewport(PHONE_VIEWPORT.width, KEYBOARD_HEIGHT);
    await layoutSettled();
    expect(window.scrollY).toBe(readingY);
  });

  test("a keyboard that shrinks only the visual viewport raises the composer, with instant scrolling", async () => {
    await setViewport(PHONE_VIEWPORT);
    await layoutSettled();
    const viewport = stubVisualViewport(PHONE_VIEWPORT.height);
    const scroll = vi.spyOn(globalThis, "scrollTo");
    await openPerformance();
    await expect.element(firstParagraph).toBeInTheDocument();
    await expect.poll(bottomGap).toBeLessThanOrEqual(1);
    await composer.click();
    viewport.height = KEYBOARD_HEIGHT;
    viewport.dispatchEvent(new Event("resize"));
    await layoutSettled();
    await expect
      .poll(() => composer.element().getBoundingClientRect().bottom)
      .toBeLessThanOrEqual(KEYBOARD_HEIGHT);
    await expect.poll(bottomGap).toBeLessThanOrEqual(1);
    expect(scroll).toHaveBeenCalledWith({
      top: document.documentElement.scrollHeight,
      behavior: "instant",
    });
    viewport.height = PHONE_VIEWPORT.height;
    viewport.dispatchEvent(new Event("resize"));
    await layoutSettled();
    await expect.poll(bottomGap).toBeLessThanOrEqual(1);
    const readingY = await readEarlier();
    viewport.height = KEYBOARD_HEIGHT;
    viewport.dispatchEvent(new Event("resize"));
    await layoutSettled();
    expect(window.scrollY).toBe(readingY);
  });

  test("a sub-pixel visual viewport scroll leaves wheel scrolling alone", async () => {
    const viewport = stubVisualViewport(LAPTOP_VIEWPORT.height);
    await openPerformance();
    await expect.element(firstParagraph).toBeInTheDocument();
    await expect.poll(bottomGap).toBeLessThanOrEqual(1);
    await layoutSettled();
    // Firefox's wheel scrolling: the visual viewport's scroll, a fraction
    // of a pixel off, arrives before the window's own scroll event.
    const y = Math.floor(window.scrollY / 2);
    const moved = scrolled();
    window.scrollTo({ top: y, behavior: "instant" });
    viewport.offsetTop = VIEWPORT_JITTER;
    viewport.dispatchEvent(new Event("scroll"));
    await moved;
    await layoutSettled();
    expect(window.scrollY).toBe(y);
  });

  test("with reduced motion, following still scrolls instantly", async () => {
    await commands.reduceMotion(true);
    onTestFinished(async () => {
      await commands.reduceMotion(false);
    });
    const scroll = vi.spyOn(globalThis, "scrollTo");
    await openPerformance();
    await expect.poll(bottomGap).toBeLessThanOrEqual(1);
    grow();
    await layoutSettled();
    expect(bottomGap()).toBeLessThanOrEqual(1);
    const calls: readonly unknown[][] = scroll.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    expect(calls).toEqual(
      calls.map(() => [expect.objectContaining({ behavior: "instant" })]),
    );
  });
});
