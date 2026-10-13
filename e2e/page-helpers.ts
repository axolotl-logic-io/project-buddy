// Small helpers any spec may need, whatever page it is on: finding the page's
// own alert, and making text no other test uses.
import type { Locator, Page } from "@playwright/test";

const UNIQUE_LENGTH = 8;

// The page's own alert. Next's route announcer is an alert too, outside the
// main landmark.
function alertIn(page: Page): Locator {
  return page.getByRole("main").getByRole("alert");
}

// A word no other test uses, so text a test looks for is its own.
function unique(word: string): string {
  return `${word}-${crypto.randomUUID().slice(0, UNIQUE_LENGTH)}`;
}

export { alertIn, unique };
