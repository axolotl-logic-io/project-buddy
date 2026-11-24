"use client";

import type { JSX } from "react";
import { dayOfMonth, weekdayOf } from "@/components/calendar-days.ts";
import type { LocalDate } from "@/streaks/streaks.ts";
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

export { DateHeading };
