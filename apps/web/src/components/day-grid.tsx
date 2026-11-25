import type { JSX } from "react";
import {
  dayOfMonth,
  monthOf,
  periodName,
  weekdayOf,
} from "@/components/calendar-days.ts";
import {
  CADENCES,
  type Cadence,
  type LocalDate,
  periodGrid,
  type TaskHistory,
  type TrackedTask,
} from "@/streaks/streaks.ts";
import { CADENCE_COPY } from "@/ui/copy/cadence.ts";
import { DAY_GRID_COPY } from "@/ui/copy/day-grid.ts";

// How many days, weeks or months each row shows.
const PERIODS_SHOWN = 7;

// The short label over a period's square: a day's weekday letter, a week's
// Monday's day of the month, or a month's short name.
function periodLabel(cadence: Cadence, start: LocalDate): string {
  if (cadence === "monthly") {
    return monthOf(start);
  }
  if (cadence === "weekly") {
    return dayOfMonth(start);
  }
  return weekdayOf(start).slice(0, 1);
}

// A quest's recurring tasks of one cadence over their last seven periods:
// one row of squares a task, filled when it was done and empty when it
// wasn't, and none before the task was added.
function CadenceRows({
  history,
  tasks,
  cadence,
}: {
  readonly history: TaskHistory;
  readonly tasks: readonly TrackedTask[];
  readonly cadence: Cadence;
}): JSX.Element | null {
  const grid = periodGrid(history, tasks, cadence, PERIODS_SHOWN);
  if (grid.rows.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-col gap-2">
      <h4 className="font-medium text-muted text-sm">
        {CADENCE_COPY.words(cadence).heading}
      </h4>
      <ul className="day-grid">
        {grid.rows.map((row) => (
          <li key={row.number}>
            <p className="wrap-anywhere">{row.text}</p>
            <ol className="day-grid-days">
              {row.marks.map((mark, index) => {
                const date = grid.dates[index] ?? "";
                return (
                  <li key={date} className="day-grid-day" data-mark={mark}>
                    <span aria-hidden="true">{periodLabel(cadence, date)}</span>
                    <span aria-hidden="true" className="day-grid-square" />
                    <span className="sr-only">
                      {DAY_GRID_COPY.period(periodName(cadence, date), mark)}
                    </span>
                  </li>
                );
              })}
            </ol>
          </li>
        ))}
      </ul>
    </div>
  );
}

// A quest's recurring tasks, grouped by cadence: Every day over the last
// seven days, Every week over the last seven weeks and Every month over the
// last seven months.
function DayGrid({
  history,
  tasks,
}: {
  readonly history: TaskHistory;
  readonly tasks: readonly TrackedTask[];
}): JSX.Element {
  let body: JSX.Element;
  if (tasks.length === 0) {
    body = <p className="text-muted text-sm">{DAY_GRID_COPY.noRecurring}</p>;
  } else {
    body = (
      <>
        <div className="flex flex-col gap-4">
          {CADENCES.map((cadence) => (
            <CadenceRows
              cadence={cadence}
              history={history}
              key={cadence}
              tasks={tasks}
            />
          ))}
        </div>
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
