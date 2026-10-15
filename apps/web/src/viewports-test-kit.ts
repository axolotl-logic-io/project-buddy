// For the tests: the screen sizes they lay pages out at, in CSS pixels, and
// the least size of a touch target. The Playwright specs in e2e/ set the
// sizes with page.setViewportSize, the browser tests (*.browser.test.tsx)
// with page.viewport from vitest/browser.

// A screen's size, in CSS px.
interface ViewportSize {
  readonly width: number;
  readonly height: number;
}

// A laptop's screen: the tests' own, Playwright's Desktop Chrome.
const LAPTOP_VIEWPORT: ViewportSize = { width: 1280, height: 720 };

// A phone's screen.
const PHONE_VIEWPORT: ViewportSize = { width: 390, height: 844 };

// An iPhone 15's screen, the phone the compact header ruling
// (`header-links-slot`, #17) is set on.
const IPHONE_15_VIEWPORT: ViewportSize = { width: 393, height: 852 };

// The narrowest screen the site supports: WCAG 1.4.10 (Reflow) asks a page
// to fit 320 CSS px without scrolling sideways.
const NARROWEST_VIEWPORT: ViewportSize = { width: 320, height: 640 };

// The least width and height of a target, in CSS px, by WCAG 2.2's 2.5.8
// (Target Size (Minimum)).
const MINIMUM_TARGET_PX = 24;

export type { ViewportSize };
export {
  IPHONE_15_VIEWPORT,
  LAPTOP_VIEWPORT,
  MINIMUM_TARGET_PX,
  NARROWEST_VIEWPORT,
  PHONE_VIEWPORT,
};
