// For signed-in-pages.browser.test.tsx: where elements sit and how they
// look, measured in the page under test.

// An element's font size, in pixels.
function fontSize(element: Element): number {
  return Number.parseFloat(getComputedStyle(element).fontSize);
}

export { fontSize };
