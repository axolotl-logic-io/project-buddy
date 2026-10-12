// Screen sizes the specs set with page.setViewportSize, in CSS pixels.

// A laptop's screen: the tests' own, Playwright's Desktop Chrome.
const LAPTOP_VIEWPORT = { width: 1280, height: 720 } as const;

// A phone's screen.
const PHONE_VIEWPORT = { width: 390, height: 844 } as const;

// The narrowest screen the site supports: WCAG 1.4.10 (Reflow) asks a page
// to fit 320 CSS px without scrolling sideways.
const NARROWEST_VIEWPORT = { width: 320, height: 640 } as const;

export { LAPTOP_VIEWPORT, NARROWEST_VIEWPORT, PHONE_VIEWPORT };
