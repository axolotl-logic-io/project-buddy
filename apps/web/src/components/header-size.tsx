"use client";

import { useLayoutEffect } from "react";

// Adventure controls and message jumps reserve only the breadcrumb row left
// visible after the brand and controls scroll away. CSS supplies the SSR size.
function HeaderSize(): null {
  useLayoutEffect(() => {
    const header = document.querySelector<HTMLElement>(".site-header");
    if (header === null) {
      return;
    }
    const element = header;
    function update(): void {
      const trail = element.querySelector(".header-breadcrumbs");
      let controlsHeight = 0;
      let pinnedHeight = 0;
      if (trail !== null) {
        const bounds = element.getBoundingClientRect();
        controlsHeight = trail.getBoundingClientRect().top - bounds.top;
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
