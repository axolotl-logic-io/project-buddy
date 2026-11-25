// The browser's own date, for marking Today in Home's tables. Only client
// components can use it, so it stays apart from calendar-days.ts, which the
// server's Day grid uses too.
import { useSyncExternalStore } from "react";
import { type LocalDate, localDate } from "@/streaks/streaks.ts";

function subscribeToNothing(): () => void {
  return (): void => {
    // The date a page opened on is the one it shows until it reloads.
  };
}

function browserToday(): LocalDate {
  return localDate(
    new Date(),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
}

// The server can't know the browser's date, so it marks no column Today.
function noToday(): string {
  return "";
}

// The browser's own date, once the page is in the browser, and "" before.
function useBrowserToday(): string {
  return useSyncExternalStore(subscribeToNothing, browserToday, noToday);
}

export { useBrowserToday };
