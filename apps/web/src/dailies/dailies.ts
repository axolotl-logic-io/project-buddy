// The days of a Dailies quest and the streaks of its recurring tasks. Start
// Day begins a day, dated by the user's own calendar, and ends the one
// before it, recording whether each recurring task was done. A streak is a
// recurring task's run of consecutive calendar days with it done, and its
// chain leads to its next milestone; a calendar day on which no day was
// started is a gap, and a gap ends every streak. It imports nothing from
// the server, because the browser shows the streaks of the tasks as they
// change.
import { z } from "zod";
import type { Tasks } from "@/tasks/tasks.ts";

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

const DAY_MS = 86_400_000;

// A calendar date as the user's browser saw it, as YYYY-MM-DD.
const LOCAL_DATE = z
  .string()
  .regex(LOCAL_DATE_PATTERN)
  .refine((text) => {
    const parsed = new Date(`${text}T00:00:00Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === text
    );
  });

type LocalDate = z.infer<typeof LOCAL_DATE>;

// A recurring task as a day ended: its number and text then, and whether it
// was done.
const DAY_TASK = z.object({
  number: z.number().int().positive(),
  text: z.string(),
  done: z.boolean(),
});

type DayTask = z.infer<typeof DAY_TASK>;

// A started day: its date and when it started, and, once the next Start Day
// has ended it, its recurring tasks as they ended. The newest day has no
// tasks while it is still going.
interface DailiesDay {
  readonly date: LocalDate;
  readonly startedAt: Date;
  readonly tasks?: readonly DayTask[] | undefined;
}

// A Dailies quest's days, oldest first, and whether the newest Start Day can
// still be undone: until someone sends a message in its conversation.
interface DailiesRecord {
  readonly days: readonly DailiesDay[];
  readonly undoable: boolean;
}

// What a grid cell says about a recurring task on a calendar date: done,
// not done, not done yet on the day still going, not recurring that day, or
// a gap, with no day started on that date.
type DayMark = "done" | "missed" | "pending" | "untracked" | "gap";

// The newest calendar dates, oldest first, and each recurring task's mark on
// each of them.
interface DayGrid {
  readonly dates: readonly LocalDate[];
  readonly rows: readonly {
    readonly number: number;
    readonly text: string;
    readonly marks: readonly DayMark[];
  }[];
}

// How far a browser's date may be from the server's own, in days, before
// the server's date is used instead: as far as time zones reach, and a day
// more for a clock that is a little wrong.
const MOST_DAYS_FROM_SERVER = 2;

function dateAt(milliseconds: number): LocalDate {
  return new Date(milliseconds).toISOString().slice(0, 10);
}

function millisecondsOf(date: LocalDate): number {
  return Date.parse(`${date}T00:00:00Z`);
}

function addDays(date: LocalDate, days: number): LocalDate {
  return dateAt(millisecondsOf(date) + days * DAY_MS);
}

// The date a new day takes: the browser's date when it sent a believable
// one, or else the server's UTC date.
function dayDate(sent: unknown, now: Date): LocalDate {
  const server = dateAt(now.getTime());
  const parsed = LOCAL_DATE.safeParse(sent);
  if (
    parsed.success &&
    Math.abs(millisecondsOf(parsed.data) - millisecondsOf(server)) <=
      MOST_DAYS_FROM_SERVER * DAY_MS
  ) {
    return parsed.data;
  }
  return server;
}

// The date the browser that runs this is on.
function todayHere(now: Date): LocalDate {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

// A task's mark on date, across every day started on that date: done when
// any of them has it done; else pending when the day still going has it
// open; else missed when one ended without it; else untracked. A date on
// which no day was started is a gap.
function doneOn(
  days: readonly DailiesDay[],
  tasks: Tasks,
  number: number,
  date: LocalDate,
): DayMark {
  const onDate = days.filter((day) => day.date === date);
  if (onDate.length === 0) {
    return "gap";
  }
  let mark: DayMark = "untracked";
  for (const day of onDate) {
    const dayMark = markOf(day, tasks, number);
    if (dayMark === "done") {
      return "done";
    }
    if (dayMark === "pending" || (dayMark === "missed" && mark !== "pending")) {
      mark = dayMark;
    }
  }
  return mark;
}

function markOf(
  day: DailiesDay,
  tasks: Tasks,
  number: number,
): Exclude<DayMark, "gap"> {
  if (day.tasks === undefined) {
    const task = tasks.items.find((each) => each.number === number);
    if (task?.recurring !== true) {
      return "untracked";
    }
    if (task.done) {
      return "done";
    }
    return "pending";
  }
  const task = day.tasks.find((each) => each.number === number);
  if (task === undefined) {
    return "untracked";
  }
  if (task.done) {
    return "done";
  }
  return "missed";
}

// The milestones in days, before they settle into steps of MILESTONE_STEP
// days.
const FIRST_MILESTONES: readonly { readonly days: number }[] = [
  { days: 3 },
  { days: 7 },
  { days: 14 },
  { days: 30 },
];
const MILESTONE_STEP = 30;

// The first milestone longer than days.
function milestoneAfter(days: number): number {
  const fixed = FIRST_MILESTONES.find((milestone) => milestone.days > days);
  if (fixed !== undefined) {
    return fixed.days;
  }
  return (Math.floor(days / MILESTONE_STEP) + 1) * MILESTONE_STEP;
}

// A recurring task's streak, drawn as a chain of links that ends at its
// next milestone. The links before earned stand for days of the streak
// before the current day, and the one at earned for the current day, done
// when doneToday. Past MILESTONE_STEP days the chain starts at the last multiple
// of MILESTONE_STEP, so it never has more than MILESTONE_STEP links.
interface StreakChain {
  // How many consecutive calendar days, up to the newest day's date, the
  // task was done: the newest day counts once the task is done; until then
  // the streak runs to the day before.
  readonly streak: number;
  readonly doneToday: boolean;
  readonly milestone: number;
  readonly links: number;
  readonly earned: number;
}

function chainOf(streak: number, doneToday: boolean): StreakChain {
  let before = streak;
  if (doneToday) {
    before -= 1;
  }
  const milestone = milestoneAfter(before);
  let start = 0;
  if (before >= MILESTONE_STEP) {
    start = Math.floor(before / MILESTONE_STEP) * MILESTONE_STEP;
  }
  return {
    streak,
    doneToday,
    milestone,
    links: milestone - start,
    earned: before - start,
  };
}

// Each recurring task's streak chain, by its number. A gap, or a day that
// ended without the task, ends a streak. Before the first day, and for
// one-off tasks, there are none.
function streakChains(
  days: readonly DailiesDay[],
  tasks: Tasks,
): ReadonlyMap<number, StreakChain> {
  const found = new Map<number, StreakChain>();
  const newest = days.at(-1);
  if (newest === undefined) {
    return found;
  }
  for (const task of tasks.items.filter((each) => each.recurring === true)) {
    const doneToday = doneOn(days, tasks, task.number, newest.date) === "done";
    let count = 0;
    if (doneToday) {
      count = 1;
    }
    let date = addDays(newest.date, -1);
    while (doneOn(days, tasks, task.number, date) === "done") {
      count += 1;
      date = addDays(date, -1);
    }
    found.set(task.number, chainOf(count, doneToday));
  }
  return found;
}

// At most count calendar dates, up to the newest day's date and from the
// first day's at the earliest, and each recurring task's mark on each.
function dayGrid(
  days: readonly DailiesDay[],
  tasks: Tasks,
  count: number,
): DayGrid {
  const first = days.at(0);
  const newest = days.at(-1);
  if (first === undefined || newest === undefined) {
    return { dates: [], rows: [] };
  }
  const dates: LocalDate[] = [];
  let { date } = newest;
  while (dates.length < count && date >= first.date) {
    dates.unshift(date);
    date = addDays(date, -1);
  }
  return {
    dates,
    rows: tasks.items
      .filter((task) => task.recurring === true)
      .map((task) => ({
        number: task.number,
        text: task.text,
        marks: dates.map((each) => doneOn(days, tasks, task.number, each)),
      })),
  };
}

export type {
  DailiesDay,
  DailiesRecord,
  DayGrid,
  DayMark,
  DayTask,
  LocalDate,
  StreakChain,
};
export { DAY_TASK, dayDate, dayGrid, LOCAL_DATE, streakChains, todayHere };
