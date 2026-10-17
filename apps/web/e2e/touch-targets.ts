// The size of every control a Playwright page shows, by WCAG 2.2's 2.5.8
// (Target Size (Minimum)), measured by src/touch-targets-test-kit.ts.
import type { Page } from "@playwright/test";
import {
  CONTROLS,
  type MeasuredTarget,
  measureEach,
  targetIndexes,
} from "@/touch-targets-test-kit.ts";

// Every target on the page and its size.
async function measureTargets(page: Page): Promise<MeasuredTarget[]> {
  const controls = page.locator(CONTROLS);
  const indexes = await controls.evaluateAll(targetIndexes);
  return await controls.evaluateAll(measureEach, indexes);
}

export { measureTargets };
