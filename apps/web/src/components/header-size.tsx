"use client";

import { useLayoutEffect } from "react";

// The header's bar and its gold rim scroll away; the trail band under them
// stays pinned. Its height is what the conversation's pinned header and
// message jumps leave room for. CSS supplies both sizes for the first paint.
function HeaderSize(): null {
  useLayoutEffect(() => {
    const header = document.querySelector<HTMLElement>(".site-header");
    if (header === null) {
      return;
    }
    const element = header;
    function update(): void {
      const band = element.querySelector<HTMLElement>(".trail-band");
      let controlsHeight = 0;
      let pinnedHeight = 0;
      if (band !== null) {
        const bounds = element.getBoundingClientRect();
        // clientTop is the rim, the band's top border.
        controlsHeight =
          band.getBoundingClientRect().top - bounds.top + band.clientTop;
        pinnedHeight = bounds.height - controlsHeight;
      }
      element.style.setProperty(
        "--header-controls-height",
        `${controlsHeight}px`,
      );
      document.documentElement.style.setProperty(
        "--site-header-height",
        `${pinnedHeight}px`,
      );
    }
    const observer = new ResizeObserver(update);
    observer.observe(element);
    update();
    return (): void => {
      observer.disconnect();
      element.style.removeProperty("--header-controls-height");
      document.documentElement.style.removeProperty("--site-header-height");
    };
  });
  return null;
}

export { HeaderSize };
