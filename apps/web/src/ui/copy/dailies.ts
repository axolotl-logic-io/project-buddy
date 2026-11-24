import type { DayMark } from "@/dailies/dailies.ts";

const MARK_TEXT: Readonly<Record<DayMark, string>> = {
  done: "done",
  missed: "not done",
  pending: "not done yet",
  untracked: "not recurring that day",
  gap: "no day started",
};

const HOUR_MS = 3_600_000;

const HOURS_PER_DAY = 24;

// How long the line counts in hours before it counts in days.
const HOURS_SHOWN = 48;

function plural(count: number, one: string, many: string): string {
  if (count === 1) {
    return `${count} ${one}`;
  }
  return `${count} ${many}`;
}

// How long ago the newest day started, under the Start Day button: in hours
// for the first two days, and then in days.
function lastDayStarted(milliseconds: number): string {
  const hours = Math.floor(Math.max(0, milliseconds) / HOUR_MS);
  if (hours < 1) {
    return "Last day started less than an hour ago";
  }
  if (hours < HOURS_SHOWN) {
    return `Last day started ${plural(hours, "hour", "hours")} ago`;
  }
  return `Last day started ${plural(Math.floor(hours / HOURS_PER_DAY), "day", "days")} ago`;
}

export const DAY_GRID_COPY = {
  startDay: "Start Day",
  cancel: "Cancel",
  confirmStartDay:
    "Start a new day? This ends the active performance and unchecks recurring tasks.",
  emptyLists: "Lists to empty",
  lastDayStarted,
  noDayYet: "No day started yet",
  undoStartDay: "Undo Start Day",
  undoNote:
    "Undo restores the emptied lists and the performance that ended. It is available until the next message.",
  unavailable: "Start Day is unavailable for this quest or list.",
  undoUnavailable: "This Start Day can no longer be undone.",
  started: "Started a new day.",
  undone: "Restored the previous day.",
  heading: "Recurring tasks",
  noDays:
    "Start Day begins counting. Each day, the grid shows which recurring tasks you did.",
  noRecurring:
    "No recurring tasks yet. To track a task every day, open its menu in its list and choose Make recurring.",
  legend:
    "A filled square is done, an empty one is not, and a dashed one is a gap: a day you didn’t start, which ends a streak.",
  // One day's square, for screen readers: the date and the mark.
  day: (weekday: string, date: string, mark: DayMark): string =>
    `${weekday} ${date}: ${MARK_TEXT[mark]}`,
} as const;
