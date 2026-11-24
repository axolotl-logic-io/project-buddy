import type { DayMark } from "@/streaks/streaks.ts";

const MARK_TEXT: Readonly<Record<DayMark, string>> = {
  done: "done",
  missed: "not done",
  pending: "not done yet",
  untracked: "not added yet",
};

// The Day grid of a quest's recurring tasks.
export const DAY_GRID_COPY = {
  heading: "Recurring tasks",
  noRecurring:
    "No recurring tasks yet. To track a task every day, open its menu in its list and choose Make recurring.",
  legend:
    "A filled square is done and an empty one is not. Each day starts at midnight in the quest owner’s time zone.",
  // One day's square, for screen readers: the date and the mark.
  day: (weekday: string, date: string, mark: DayMark): string =>
    `${weekday} ${date}: ${MARK_TEXT[mark]}`,
} as const;
