// The streaks of a quest's recurring tasks. A recurring task repeats daily,
// weekly or monthly: its cadence. Its period is the day, the week from
// Monday or the month that holds a date, each starting at midnight in the
// quest owner's time zone (src/lists/quest-today.ts). A task was done in a
// period when someone checked it off on a date in it. A streak is a
// recurring task's run of consecutive periods with it done, and its chain
// shows its recent periods. It imports nothing from the server, because the
// browser shows the streaks of the tasks as they change.

const DAY_MS = 86_400_000;
const WEEK_DAYS = 7;
// A date's year and month, as YYYY-MM.
const YEAR_AND_MONTH: number = "YYYY-MM".length;

// A date in the quest owner's time zone, as YYYY-MM-DD.
type LocalDate = string;

// How often a recurring task repeats.
const CADENCES = ["daily", "weekly", "monthly"] as const;
type Cadence = (typeof CADENCES)[number];

// A quest's check-off history: today's date and the time zone it is in,
// and, for each task number, the dates someone checked it off, up to
// HISTORY_DAYS back.
interface TaskHistory {
  readonly today: LocalDate;
  readonly timeZone: string;
  readonly checkOffs: readonly {
    readonly number: number;
    readonly dates: readonly LocalDate[];
  }[];
}

// How many days of check-offs a history holds, and so the longest streak it
// can count: 400 days, 57 weeks or 13 months.
const HISTORY_DAYS = 400;

// A recurring task as it is now: how often it repeats, whether it is
// checked off in its current period, and when it was added, before whose
// period it has none.
interface TrackedTask {
  readonly number: number;
  readonly text: string;
  readonly cadence: Cadence;
  readonly done: boolean;
  readonly createdAt: Date;
}

// What a grid cell says about a recurring task in a period: done, not
// done, not done yet in the current period, or not yet added.
type DayMark = "done" | "missed" | "pending" | "untracked";

// A recurring task's mark in each of a run of periods.
interface MarkRow {
  readonly number: number;
  readonly text: string;
  readonly marks: readonly DayMark[];
}

function addDays(date: LocalDate, days: number): LocalDate {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

// The date of a moment in a time zone.
function localDate(moment: Date, timeZone: string): LocalDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(moment);
  function part(type: Intl.DateTimeFormatPartTypes): string {
    return parts.find((each) => each.type === type)?.value ?? "";
  }
  return `${part("year")}-${part("month")}-${part("day")}`;
}

// The first date of the period that holds date: the date itself, the
// Monday of its week, or the 1st of its month.
function periodOf(date: LocalDate, cadence: Cadence): LocalDate {
  if (cadence === "weekly") {
    // Days since Monday: getUTCDay counts from Sunday.
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    return addDays(date, -((weekday + WEEK_DAYS - 1) % WEEK_DAYS));
  }
  if (cadence === "monthly") {
    return `${date.slice(0, YEAR_AND_MONTH)}-01`;
  }
  return date;
}

// The first date of the period count periods after the one that holds
// date, or before it when count is negative.
function addPeriods(
  date: LocalDate,
  cadence: Cadence,
  count: number,
): LocalDate {
  if (cadence === "weekly") {
    return addDays(periodOf(date, cadence), count * WEEK_DAYS);
  }
  if (cadence === "monthly") {
    const first = new Date(`${periodOf(date, cadence)}T00:00:00Z`);
    first.setUTCMonth(first.getUTCMonth() + count);
    return first.toISOString().slice(0, 10);
  }
  return addDays(date, count);
}

// A task's mark in the period that holds a date: before the period it was
// added in, or after the quest's current one, untracked; in the current
// period, done once checked off and pending until then; before it, done
// when someone checked it off on a date in it and missed otherwise.
function markOn(
  history: TaskHistory,
  done: ReadonlySet<LocalDate>,
  task: TrackedTask,
  date: LocalDate,
): DayMark {
  const period = periodOf(date, task.cadence);
  const current = periodOf(history.today, task.cadence);
  if (
    period <
      periodOf(localDate(task.createdAt, history.timeZone), task.cadence) ||
    period > current
  ) {
    return "untracked";
  }
  if (period === current) {
    if (task.done) {
      return "done";
    }
    return "pending";
  }
  if (done.has(period)) {
    return "done";
  }
  return "missed";
}

// The first dates of the periods someone checked off a task in.
function donePeriods(
  history: TaskHistory,
  { number, cadence }: Pick<TrackedTask, "number" | "cadence">,
): ReadonlySet<LocalDate> {
  return new Set(
    history.checkOffs
      .find((each) => each.number === number)
      ?.dates.map((date) => periodOf(date, cadence)),
  );
}

function checkOffDates(
  history: TaskHistory,
  number: number,
): readonly LocalDate[] {
  return history.checkOffs.find((each) => each.number === number)?.dates ?? [];
}

const MAX_STREAK_LINKS = 30;

// How many periods Home's tables of streaks show, and so how far back they
// can change a task's mark.
const STREAK_TABLE_PERIODS = 7;

// The recent periods of a streak, with a separate link for the current one.
interface StreakChain {
  readonly cadence: Cadence;
  // How many consecutive periods, up to the current one, the task was
  // done: the current period counts once the task is done; until then the
  // streak runs to the one before.
  readonly streak: number;
  readonly doneNow: boolean;
  readonly links: number;
  readonly earned: number;
}

function chainOf(
  cadence: Cadence,
  streak: number,
  doneNow: boolean,
): StreakChain {
  let before = streak;
  if (doneNow) {
    before -= 1;
  }
  const earned = Math.min(before, MAX_STREAK_LINKS - 1);
  return { cadence, streak, doneNow, links: earned + 1, earned };
}

// Each recurring task's streak chain, by its number. A period before the
// current one without a check-off ends a streak.
function streakChains(
  history: TaskHistory,
  tasks: readonly TrackedTask[],
): ReadonlyMap<number, StreakChain> {
  const found = new Map<number, StreakChain>();
  for (const task of tasks) {
    const done = donePeriods(history, task);
    let count = 0;
    if (task.done) {
      count = 1;
    }
    let period = addPeriods(history.today, task.cadence, -1);
    while (done.has(period)) {
      count += 1;
      period = addPeriods(period, task.cadence, -1);
    }
    found.set(task.number, chainOf(task.cadence, count, task.done));
  }
  return found;
}

// The first dates of the count periods up to the one that holds last,
// oldest first.
function periodsUpTo(
  last: LocalDate,
  cadence: Cadence,
  count: number,
): LocalDate[] {
  return Array.from({ length: count }, (_, place) =>
    addPeriods(last, cadence, place - count + 1),
  );
}

// The count dates up to last, oldest first.
function datesUpTo(last: LocalDate, count: number): LocalDate[] {
  return periodsUpTo(last, "daily", count);
}

// Each recurring task's mark in the period that holds each date.
function markRows(
  history: TaskHistory,
  tasks: readonly TrackedTask[],
  dates: readonly LocalDate[],
): readonly MarkRow[] {
  return tasks.map((task) => {
    const done = donePeriods(history, task);
    return {
      number: task.number,
      text: task.text,
      marks: dates.map((each) => markOn(history, done, task, each)),
    };
  });
}

// The periods of a cadence several quests' rows share: count of them, up
// to the one that holds the newest of the quests' todays, which differ when
// their owners' time zones do. With no quests there are none.
function sharedPeriods(
  todays: readonly LocalDate[],
  cadence: Cadence,
  count: number,
): readonly LocalDate[] {
  const newest = todays.toSorted().at(-1);
  if (newest === undefined) {
    return [];
  }
  return periodsUpTo(newest, cadence, count);
}

// The dates several quests' rows share, as sharedPeriods for days.
function sharedDates(
  todays: readonly LocalDate[],
  count: number,
): readonly LocalDate[] {
  return sharedPeriods(todays, "daily", count);
}

// One task's mark in the period that holds a date, checked or unchecked.
interface MarkChange {
  readonly number: number;
  readonly date: LocalDate;
  readonly done: boolean;
}

// A quest's history and recurring tasks after a change of one task's mark
// in one period: in the current period it is the task's own check, and in
// an earlier one it is whether someone checked it off in it.
function withMark<Task extends TrackedTask>(
  history: TaskHistory,
  tasks: readonly Task[],
  { number, date, done }: MarkChange,
): { readonly history: TaskHistory; readonly tasks: readonly Task[] } {
  const marked = tasks.find((task) => task.number === number);
  if (marked === undefined) {
    return { history, tasks };
  }
  const period = periodOf(date, marked.cadence);
  if (period === periodOf(history.today, marked.cadence)) {
    return {
      history,
      tasks: tasks.map((task) => {
        if (task !== marked) {
          return task;
        }
        return { ...task, done };
      }),
    };
  }
  const changed = checkOffDates(history, number).filter(
    (each) => periodOf(each, marked.cadence) !== period,
  );
  if (done) {
    changed.push(period);
  }
  return {
    tasks,
    history: {
      ...history,
      checkOffs: [
        ...history.checkOffs.filter((each) => each.number !== number),
        { number, dates: changed.toSorted((a, b) => a.localeCompare(b)) },
      ],
    },
  };
}

export type {
  Cadence,
  DayMark,
  LocalDate,
  MarkChange,
  StreakChain,
  TaskHistory,
  TrackedTask,
};
export {
  addDays,
  addPeriods,
  CADENCES,
  datesUpTo,
  HISTORY_DAYS,
  localDate,
  MAX_STREAK_LINKS,
  markRows,
  periodOf,
  STREAK_TABLE_PERIODS,
  sharedDates,
  sharedPeriods,
  streakChains,
  withMark,
};
