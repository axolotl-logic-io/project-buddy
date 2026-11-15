// The durations of the timer this browser tab last showed, kept in the
// tab's session storage, so the Timer's setup offers them again in the same
// tab and nowhere else. The server never sees them. Without storage, as
// when the browser blocks it, nothing is kept and setup offers the
// defaults. Only the browser imports this module.
import { useSyncExternalStore } from "react";
import {
  DEFAULT_DURATIONS,
  parseTimerDurations,
  type TimerDurations,
} from "@/timer/schedule.ts";

const KEY = "timer:durations";

// The tab's session storage, or null if the browser blocks it.
function storageOrNull(): Storage | null {
  try {
    return sessionStorage;
  } catch {
    return null;
  }
}

// The tab's kept durations as stored, or null.
function storedDurations(): string | null {
  try {
    return storageOrNull()?.getItem(KEY) ?? null;
  } catch {
    return null;
  }
}

// The server has no tab, so it keeps nothing.
function nothingStored(): null {
  return null;
}

// Nothing else in the tab changes the kept durations while setup is open.
function unchanging(): () => void {
  return (): void => undefined;
}

// The durations stored, or the defaults.
function parseStored(stored: string | null): TimerDurations {
  if (stored === null) {
    return DEFAULT_DURATIONS;
  }
  try {
    return parseTimerDurations(JSON.parse(stored)) ?? DEFAULT_DURATIONS;
  } catch {
    return DEFAULT_DURATIONS;
  }
}

// The durations the tab last showed, or the defaults, which the server
// renders too.
function useRememberedDurations(): TimerDurations {
  return parseStored(
    useSyncExternalStore(unchanging, storedDurations, nothingStored),
  );
}

// Keeps durations as the tab's last. A browser that refuses keeps nothing.
function rememberDurations({
  workMinutes,
  breakMinutes,
}: TimerDurations): void {
  try {
    storageOrNull()?.setItem(
      KEY,
      JSON.stringify({ workMinutes, breakMinutes }),
    );
  } catch {
    // Nothing is kept; setup offers the defaults.
  }
}

export { rememberDurations, useRememberedDurations };
