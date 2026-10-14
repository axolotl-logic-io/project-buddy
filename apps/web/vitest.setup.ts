import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

function doNothing(): void {
  // jsdom lays nothing out, so nothing resizes or scrolls.
}

class NoResizeObserver {
  readonly observe = doNothing;
  readonly unobserve = doNothing;
  readonly disconnect = doNothing;
}

// jsdom has no ResizeObserver or scrollTo; the chat thread uses both. They
// are defined rather than stubbed, so vi.unstubAllGlobals keeps them.
if (typeof HTMLElement !== "undefined") {
  Object.defineProperty(globalThis, "ResizeObserver", {
    value: NoResizeObserver,
  });
  Object.defineProperty(HTMLElement.prototype, "scrollTo", {
    value: doNothing,
  });
}

afterEach(() => {
  cleanup();
});
