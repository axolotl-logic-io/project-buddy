import type { JSX } from "react";
import {
  dayGrid,
  type LocalDate,
  type TaskHistory,
  type TrackedTask,
} from "@/streaks/streaks.ts";
import { DAY_GRID_COPY } from "@/ui/copy/day-grid.ts";

// How many calendar dates the grid shows.
const DAYS_SHOWN = 7;

// The weekday of a date, the same on the server and in every browser,
// since the date is already in the quest owner's time zone.
const WEEKDAY = new Intl.DateTimeFormat("en", {
  weekday: "short",
  timeZone: "UTC",
});

function weekdayOf(date: LocalDate): string {
  return WEEKDAY.format(new Date(`${date}T00:00:00Z`));
}

// A quest's recurring tasks over their last seven dates: one row of squares
// a task, filled when it was done and empty when it wasn't, and none before
// the task was added.
function DayGrid({
  history,
  tasks,
}: {
  readonly history: TaskHistory;
  readonly tasks: readonly TrackedTask[];
}): JSX.Element {
  const grid = dayGrid(history, tasks, DAYS_SHOWN);
  let body: JSX.Element;
  if (grid.rows.length === 0) {
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
