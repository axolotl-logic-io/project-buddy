"use client";

import { useLayoutEffect } from "react";

// The header's bar and its gold rim scroll away; the trail band under them
// stays pinned. Its height is what message jumps leave room for. Panels
// start at the breadcrumb row so their close and expand controls align.
// CSS supplies initial sizes.
function HeaderSize(): null {
  useLayoutEffect(() => {
    const header = document.querySelector<HTMLElement>(".site-header");
    if (header === null) {
      return;
    }
    const element = header;
    function updatePanelTop(): void {
      const band = element.querySelector<HTMLElement>(".trail-band");
      if (band !== null) {
        const panelTop = band.getBoundingClientRect().top + band.clientTop;
        document.documentElement.style.setProperty(
          "--panel-top",
          `${panelTop}px`,
        );
        document.documentElement.style.setProperty(
          "--panel-tab-height",
          `${band.clientHeight}px`,
        );
      }
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
      updatePanelTop();
    }
    const observer = new ResizeObserver(update);
    observer.observe(element);
    update();
    globalThis.addEventListener("scroll", updatePanelTop, { passive: true });
    globalThis.addEventListener("resize", updatePanelTop);
    return (): void => {
      observer.disconnect();
      globalThis.removeEventListener("scroll", updatePanelTop);
      globalThis.removeEventListener("resize", updatePanelTop);
      element.style.removeProperty("--header-controls-height");
      document.documentElement.style.removeProperty("--site-header-height");
      document.documentElement.style.removeProperty("--panel-top");
      document.documentElement.style.removeProperty("--panel-tab-height");
    };
  });
  return null;
}

export { HeaderSize };
