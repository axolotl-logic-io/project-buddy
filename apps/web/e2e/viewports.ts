// Screen sizes the specs set with page.setViewportSize, in CSS pixels.
import type { ViewportSize } from "@playwright/test";

// A laptop's screen: the tests' own, Playwright's Desktop Chrome.
const LAPTOP_VIEWPORT: ViewportSize = { width: 1280, height: 720 };

// A phone's screen.
const PHONE_VIEWPORT: ViewportSize = { width: 390, height: 844 };

// An iPhone 15's screen, the phone Autumn's header ruling (#17) is set on.
const IPHONE_15_VIEWPORT: ViewportSize = { width: 393, height: 852 };

// The narrowest screen the site supports: WCAG 1.4.10 (Reflow) asks a page
// to fit 320 CSS px without scrolling sideways.
const NARROWEST_VIEWPORT: ViewportSize = { width: 320, height: 640 };

export {
  IPHONE_15_VIEWPORT,
  LAPTOP_VIEWPORT,
  NARROWEST_VIEWPORT,
  PHONE_VIEWPORT,
};
