// Screen sizes the specs set with page.setViewportSize, in CSS pixels.

// A laptop's screen: the tests' own, Playwright's Desktop Chrome.
const LAPTOP_VIEWPORT = { width: 1280, height: 720 } as const;

// A phone's screen.
const PHONE_VIEWPORT = { width: 390, height: 844 } as const;

export { LAPTOP_VIEWPORT, PHONE_VIEWPORT };
