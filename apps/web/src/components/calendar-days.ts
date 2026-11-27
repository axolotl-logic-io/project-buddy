// The days, weeks and months Home's tables and a tally's card
// show: their weekdays, days of the month, months and names.
import type { Cadence, LocalDate } from "@/streaks/streaks.ts";
import { CADENCE_COPY } from "@/ui/copy/cadence.ts";

// Each part of a calendar date, the same on the server and in every
// browser, since the date already is the user's own.
const WEEKDAY = new Intl.DateTimeFormat("en", {
  weekday: "short",
  timeZone: "UTC",
});
const MONTH = new Intl.DateTimeFormat("en", {
  month: "short",
  timeZone: "UTC",
});
const MONTH_AND_YEAR = new Intl.DateTimeFormat("en", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function moment(date: LocalDate): Date {
  return new Date(`${date}T00:00:00Z`);
}

function weekdayOf(date: LocalDate): string {
  return WEEKDAY.format(moment(date));
}

function dayOfMonth(date: LocalDate): string {
  return String(Number(date.slice(-2)));
}

// A date's month, shortened: "Nov".
function monthOf(date: LocalDate): string {
  return MONTH.format(moment(date));
}

// The day, week or month whose first date is start, by name: "Wed 25 Nov",
// "week of Mon 23 Nov" or "November 2026".
function periodName(cadence: Cadence, start: LocalDate): string {
  if (cadence === "monthly") {
    return MONTH_AND_YEAR.format(moment(start));
  }
  const day = `${weekdayOf(start)} ${dayOfMonth(start)} ${monthOf(start)}`;
  if (cadence === "weekly") {
    return CADENCE_COPY.weekOf(day);
  }
  return day;
}

export { dayOfMonth, monthOf, periodName, weekdayOf };
