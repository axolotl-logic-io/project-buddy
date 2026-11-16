"use client";

import { type JSX, useMemo } from "react";
import { useTasks } from "@/components/tasks/use-tasks.ts";
import { dayGrid, type LocalDate } from "@/dailies/dailies.ts";
import { DAY_GRID_COPY } from "@/ui/copy/dailies.ts";

// How many calendar dates the grid shows.
const DAYS_SHOWN = 7;

// The weekday of a calendar date, the same on the server and in every
// browser, since the date already is the user's own.
const WEEKDAY = new Intl.DateTimeFormat("en", {
  weekday: "short",
  timeZone: "UTC",
});

function weekdayOf(date: LocalDate): string {
  return WEEKDAY.format(new Date(`${date}T00:00:00Z`));
}

// The Dailies quest's recurring steps over their last seven calendar dates:
// one row of squares a step, filled when it was done, empty when it wasn't,
// and dashed on a gap, a date with no day started. It follows the tasks as
// they change, so checking off a step fills today's square at once. Outside
// the Dailies quest it shows nothing.
function DayGrid(): JSX.Element | null {
  const tasks = useTasks();
  const days = tasks?.days;
  const steps = tasks?.state.tasks;
  const grid = useMemo(() => {
    if (days === undefined || steps === undefined) {
      return;
    }
    return dayGrid(days, steps, DAYS_SHOWN);
  }, [days, steps]);
  if (grid === undefined) {
    return null;
  }
  let body: JSX.Element;
  if (grid.dates.length === 0) {
    body = <p className="text-muted text-sm">{DAY_GRID_COPY.noDays}</p>;
  } else if (grid.rows.length === 0) {
    body = <p className="text-muted text-sm">{DAY_GRID_COPY.noRecurring}</p>;
  } else {
    body = (
      <>
        <ul className="day-grid">
          {grid.rows.map((row) => (
            <li key={row.number}>
              <p className="wrap-anywhere">{row.text}</p>
              <ol className="day-grid-days">
                {row.marks.map((mark, index) => {
                  const date = grid.dates[index] ?? "";
                  const weekday = weekdayOf(date);
                  return (
                    <li key={date} className="day-grid-day" data-mark={mark}>
                      <span aria-hidden="true">{weekday.slice(0, 1)}</span>
                      <span aria-hidden="true" className="day-grid-square" />
                      <span className="sr-only">
                        {DAY_GRID_COPY.day(weekday, date, mark)}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </li>
          ))}
        </ul>
        <p className="text-muted text-sm">{DAY_GRID_COPY.legend}</p>
      </>
    );
  }
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-semibold">{DAY_GRID_COPY.heading}</h3>
      {body}
    </section>
  );
}

export { DayGrid };
