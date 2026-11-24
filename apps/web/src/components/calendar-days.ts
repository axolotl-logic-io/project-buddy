// The days Home's tables and a tally's card show: their weekdays, days of
// the month, and the browser's own date.
import { useSyncExternalStore } from "react";
import { type LocalDate, localDate } from "@/streaks/streaks.ts";

// The weekday of a calendar date, the same on the server and in every
// browser, since the date already is the user's own.
const WEEKDAY = new Intl.DateTimeFormat("en", {
  weekday: "short",
  timeZone: "UTC",
});

function weekdayOf(date: LocalDate): string {
  return WEEKDAY.format(new Date(`${date}T00:00:00Z`));
}

function dayOfMonth(date: LocalDate): string {
  return String(Number(date.slice(-2)));
}

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

export { dayOfMonth, useBrowserToday, weekdayOf };
