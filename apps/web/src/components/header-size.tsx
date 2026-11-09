"use client";

import { useLayoutEffect } from "react";

// Keep pinned adventure controls and anchor jumps below the actual shared
// header, including text zoom and any optional header controls.
function HeaderSize(): null {
  useLayoutEffect(() => {
    const header = document.querySelector(".site-header");
    if (header === null) {
      return;
    }
    function update(): void {
      document.documentElement.style.setProperty(
        "--site-header-height",
        `${header.getBoundingClientRect().height}px`,
      );
    }
    const observer = new ResizeObserver(update);
    observer.observe(header);
    update();
    return (): void => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--site-header-height");
    };
  }, []);
  return null;
}

export { HeaderSize };
