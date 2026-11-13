"use client";

import { useLayoutEffect } from "react";

// The header's bar and its gold rim scroll away; the trail band under them
// stays pinned. Its height is what the conversation's pinned header and
// message jumps leave room for. The sidebar follows the visible bottom of
// the entire header as the bar scrolls away. CSS supplies initial sizes.
function HeaderSize(): null {
  useLayoutEffect(() => {
    const header = document.querySelector<HTMLElement>(".site-header");
    if (header === null) {
      return;
    }
    const element = header;
    function updateBottom(): void {
      document.documentElement.style.setProperty(
        "--site-header-bottom",
        `${Math.max(0, element.getBoundingClientRect().bottom)}px`,
      );
    }
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
      updateBottom();
    }
    const observer = new ResizeObserver(update);
    observer.observe(element);
    update();
    globalThis.addEventListener("scroll", updateBottom, { passive: true });
    globalThis.addEventListener("resize", updateBottom);
    return (): void => {
      observer.disconnect();
      globalThis.removeEventListener("scroll", updateBottom);
      globalThis.removeEventListener("resize", updateBottom);
      element.style.removeProperty("--header-controls-height");
      document.documentElement.style.removeProperty("--site-header-height");
      document.documentElement.style.removeProperty("--site-header-bottom");
    };
  });
  return null;
}

export { HeaderSize };
