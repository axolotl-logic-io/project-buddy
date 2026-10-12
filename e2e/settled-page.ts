// The one wait for a page to settle, for the specs that measure a page or
// take its picture (e2e/visual/visual-page.ts, mobile.spec.ts): nothing on
// it is still loading, and its fonts, which set its sizes, are in.
import { expect, type Page } from "@playwright/test";

// What a page marks as still loading, such as a skeleton (WAI-ARIA's
// aria-busy).
const BUSY = '[aria-busy="true"]';

// Waits until nothing on the page is still loading and its fonts are in, so
// a measure or a shot never catches a skeleton or a fallback font.
async function waitUntilSettled(page: Page): Promise<void> {
  await expect(page.locator(BUSY)).toHaveCount(0);
  await page.evaluate(async (): Promise<void> => {
    await document.fonts.ready;
  });
}

export { waitUntilSettled };
