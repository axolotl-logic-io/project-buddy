"use client";

import { useSyncExternalStore } from "react";

// From this width (the lg breakpoint) the site's side panels, the site panel
// on the left and the chat panel on the right, dock beside the page instead
// of opening as drawers over it.
const WIDE_SCREEN = "(min-width: 64rem)";

function subscribeWidth(notify: () => void): () => void {
  const media = globalThis.matchMedia(WIDE_SCREEN);
  media.addEventListener("change", notify);
  return (): void => media.removeEventListener("change", notify);
}

function isWide(): boolean {
  return globalThis.matchMedia(WIDE_SCREEN).matches;
}

// The server doesn't know the screen, so its HTML is the narrow layout's.
function serverWidth(): boolean {
  return false;
}

// Whether the screen is wide enough for docked side panels.
function useWideScreen(): boolean {
  return useSyncExternalStore(subscribeWidth, isWide, serverWidth);
}

export { useWideScreen };
