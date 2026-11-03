// The browser tests' setup file (vitest.browser-setup.ts), in Chromium and
// WebKit: scrolling a test's page leaves Vitest's runner page, which holds
// it, where it is, so nothing pinned to the top of the window moves above it
// in a later test (#624).
import { afterEach, expect, test } from "vitest";
import { page } from "vitest/browser";
import { LAPTOP_VIEWPORT } from "./viewports-test-kit.ts";

// How many windows tall the test's page is, so it scrolls.
const SCREENS = 4;

afterEach(() => {
  document.body.replaceChildren();
  window.scrollTo(0, 0);
});

test("scrolling a test's page or focusing in it leaves the runner page unscrolled", async () => {
  await page.viewport(LAPTOP_VIEWPORT.width, LAPTOP_VIEWPORT.height);
  const tall = document.createElement("div");
  tall.style.height = `${LAPTOP_VIEWPORT.height * SCREENS}px`;
  const end = document.createElement("textarea");
  document.body.append(tall, end);
  end.scrollIntoView({ block: "end" });
  end.focus();
  const runner = window.parent.document.scrollingElement;
  runner?.scrollTo(0, LAPTOP_VIEWPORT.height);
  expect(window.scrollY).toBeGreaterThan(0);
  expect(runner?.scrollTop).toBe(0);
});
