// The text of the Dailies day grid, at the top of the Dailies quest's
// Progress section: each recurring task's last seven calendar days.

import type { DayMark } from "@/dailies/dailies.ts";

const MARK_TEXT: Readonly<Record<DayMark, string>> = {
  done: "done",
  missed: "not done",
  pending: "not done yet",
  untracked: "not recurring that day",
  gap: "no day started",
};

export const DAY_GRID_COPY = {
  heading: "Recurring tasks",
  noDays:
    "Start Day begins counting. Each day, the grid shows which recurring tasks you did.",
  noRecurring:
    "No recurring tasks yet. To track a task every day, open its menu in Tasks and choose Make recurring.",
  legend:
    "A filled square is done, an empty one is not, and a dashed one is a gap: a day you didn’t start, which ends a streak.",
  // One day's square, for screen readers: the date and the mark.
  day: (weekday: string, date: string, mark: DayMark): string =>
    `${weekday} ${date}: ${MARK_TEXT[mark]}`,
} as const;
