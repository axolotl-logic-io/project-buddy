"use client";

import type { JSX } from "react";
import { dayOfMonth, monthOf, weekdayOf } from "@/components/calendar-days.ts";
import { type Cadence, type LocalDate, periodOf } from "@/streaks/streaks.ts";
import { HOME_COPY } from "@/ui/copy/home.ts";

// A date's column heading in Home's tables: its weekday and day of the
// month, or Today on the browser's own date. On a phone the weekday shrinks
// to its letter.
function DateHeading({
  date,
  today,
}: {
  readonly date: LocalDate;
  readonly today: string;
}): JSX.Element {
  const weekday = weekdayOf(date);
  let name = (
    <>
      <span className="streak-weekday">{weekday}</span>
      <span aria-hidden="true" className="streak-weekday-letter">
        {weekday.slice(0, 1)}
      </span>
    </>
  );
  if (date === today) {
    name = <span>{HOME_COPY.today}</span>;
  }
  return (
    <th className="streak-date" data-today={date === today} scope="col">
      {name}
      <span>{dayOfMonth(date)}</span>
    </th>
  );
}

// A period's column heading in Home's tables of streaks, by its first
// date: a day as DateHeading names it, a week by its Monday's weekday, day
// and month, and a month by its name. The period that holds the browser's
// own date stands out. On a phone a week drops its weekday, since every
// week starts on Monday.
function PeriodHeading({
  cadence,
  start,
  today,
}: {
  readonly cadence: Cadence;
  readonly start: LocalDate;
  readonly today: string;
}): JSX.Element {
  if (cadence === "daily") {
    return <DateHeading date={start} today={today} />;
  }
  const current = today !== "" && periodOf(today, cadence) === start;
  let name = <span>{monthOf(start)}</span>;
  if (cadence === "weekly") {
    name = (
      <>
        <span className="streak-week-start">
          <span className="streak-weekday">{weekdayOf(start)} </span>
          {dayOfMonth(start)}
        </span>
        <span>{monthOf(start)}</span>
      </>
    );
  }
  return (
    <th className="streak-date" data-today={current} scope="col">
      {name}
    </th>
  );
}

export { DateHeading, PeriodHeading };
