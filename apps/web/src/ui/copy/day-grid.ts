import type { DayMark } from "@/streaks/streaks.ts";

const MARK_TEXT: Readonly<Record<DayMark, string>> = {
  done: "done",
  missed: "not done",
  pending: "not done yet",
  untracked: "not added yet",
};

// The Day grid of a quest's recurring tasks, with a row of days, weeks or
// months for each cadence.
export const DAY_GRID_COPY = {
  heading: "Recurring tasks",
  noRecurring:
    "No recurring tasks yet. To track a task, open its menu in its list and choose Repeat daily, weekly or monthly.",
  legend:
    "A filled square is done and an empty one is not. Each day, week and month starts at midnight in the quest owner’s time zone.",
  // One period's square, for screen readers: the period and the mark.
  period: (period: string, mark: DayMark): string =>
    `${period}: ${MARK_TEXT[mark]}`,
} as const;
