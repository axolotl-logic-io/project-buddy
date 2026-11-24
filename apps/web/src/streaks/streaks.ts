// The streaks of a quest's recurring tasks. A quest's day starts at
// midnight in its owner's time zone (src/lists/quest-today.ts). A task was
// done on a date when someone checked it off that day. A streak is a
// recurring task's run of consecutive dates with it done, and its chain
// shows its recent days. It imports nothing from the server, because the
// browser shows the streaks of the tasks as they change.

const DAY_MS = 86_400_000;

// A date in the quest owner's time zone, as YYYY-MM-DD.
type LocalDate = string;

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
// can count.
const HISTORY_DAYS = 400;

// A recurring task as it is now: whether it is checked off today, and when
// it was added, before which it has no days.
interface TrackedTask {
  readonly number: number;
  readonly text: string;
  readonly done: boolean;
  readonly createdAt: Date;
}

// What a grid cell says about a recurring task on a date: done, not done,
// not done yet today, or not yet added.
type DayMark = "done" | "missed" | "pending" | "untracked";

// The newest dates, oldest first, and each recurring task's mark on each of
// them.
interface DayGrid {
  readonly dates: readonly LocalDate[];
  readonly rows: readonly {
    readonly number: number;
    readonly text: string;
    readonly marks: readonly DayMark[];
  }[];
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

// A task's mark on a date: before the date it was added, untracked; today,
// done once checked off and pending until then; before today, done when
// someone checked it off that day and missed otherwise.
function markOn(
  history: TaskHistory,
  done: ReadonlySet<LocalDate>,
  task: TrackedTask,
  date: LocalDate,
): DayMark {
  if (date < localDate(task.createdAt, history.timeZone)) {
    return "untracked";
  }
  if (date === history.today) {
    if (task.done) {
      return "done";
    }
    return "pending";
  }
  if (done.has(date)) {
    return "done";
  }
  return "missed";
}

function doneDates(
  history: TaskHistory,
  number: number,
): ReadonlySet<LocalDate> {
  return new Set(
    history.checkOffs.find((each) => each.number === number)?.dates,
  );
}

const MAX_STREAK_LINKS = 30;

// The recent days of a streak, with a separate link for today.
interface StreakChain {
  // How many consecutive dates, up to today, the task was done: today
  // counts once the task is done; until then the streak runs to yesterday.
  readonly streak: number;
  readonly doneToday: boolean;
  readonly links: number;
  readonly earned: number;
}

function chainOf(streak: number, doneToday: boolean): StreakChain {
  let before = streak;
  if (doneToday) {
    before -= 1;
  }
  const earned = Math.min(before, MAX_STREAK_LINKS - 1);
  return { streak, doneToday, links: earned + 1, earned };
}

// Each recurring task's streak chain, by its number. A date before today
// without a check-off ends a streak.
function streakChains(
  history: TaskHistory,
  tasks: readonly TrackedTask[],
): ReadonlyMap<number, StreakChain> {
  const found = new Map<number, StreakChain>();
  for (const task of tasks) {
    const done = doneDates(history, task.number);
    let count = 0;
    if (task.done) {
      count = 1;
    }
    let date = addDays(history.today, -1);
    while (done.has(date)) {
      count += 1;
      date = addDays(date, -1);
    }
    found.set(task.number, chainOf(count, task.done));
  }
  return found;
}

// At most count dates, up to today and from the date the first task was
// added at the earliest, and each recurring task's mark on each.
function dayGrid(
  history: TaskHistory,
  tasks: readonly TrackedTask[],
  count: number,
): DayGrid {
  const first =
    tasks
      .map(({ createdAt }) => localDate(createdAt, history.timeZone))
      .concat(history.today)
      .toSorted()
      .at(0) ?? history.today;
  const dates = Array.from({ length: count }, (_, place) =>
    addDays(history.today, place - count + 1),
  ).filter((date) => date >= first);
  return {
    dates,
    rows: tasks.map((task) => {
      const done = doneDates(history, task.number);
      return {
        number: task.number,
        text: task.text,
        marks: dates.map((each) => markOn(history, done, task, each)),
      };
    }),
  };
}

export type {
  DayGrid,
  DayMark,
  LocalDate,
  StreakChain,
  TaskHistory,
  TrackedTask,
};
export { dayGrid, HISTORY_DAYS, localDate, MAX_STREAK_LINKS, streakChains };
