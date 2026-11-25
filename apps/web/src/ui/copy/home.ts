import type { Cadence } from "@/streaks/streaks.ts";
import { CADENCE_COPY } from "@/ui/copy/cadence.ts";
import { pageTitle } from "@/ui/copy/site.ts";

// Home, the signed-in landing page: the user's experience, then the
// streaks of every recurring task across their quests, in a grid for each
// cadence (src/ui/copy/cadence.ts), then their tallies
// (src/ui/copy/tallies.ts), then their one-off tasks, and the site panel's
// link to it.
export const HOME_COPY = {
  title: pageTitle("Home"),
  heading: "Home",
  headerLink: "Home",
  // The experience strip's link to the full card on Profile, after the
  // experience the next circle needs.
  profileLink: "Profile",
  profileSeparator: "·",
  streaksHeading: "Streaks",
  // The table's first column, which names each task, for screen readers.
  taskColumn: "Task",
  streakColumn: "Streak",
  today: "Today",
  // A quest's line above its tasks in a cadence's grid, after its name.
  recurringCount: (count: number, cadence: Cadence): string =>
    `· ${count} ${CADENCE_COPY.words(cadence).adverb}`,
  // A task's streak unit, after its number.
  streakUnit: (streak: number, cadence: Cadence): string => {
    const { one, many } = CADENCE_COPY.words(cadence);
    if (streak === 1) {
      return one;
    }
    return many;
  },
  // A square, by its accessible name; whether it is checked says whether
  // the task was done.
  square: (task: string, period: string): string => `${task}, ${period}`,
  noStreaks:
    "No streaks yet. To count a task here, open its menu in a quest’s list and choose Repeat daily, weekly or monthly.",
  legend:
    "Check a square to mark a task done in that day, week or month. One without a check-off ends a streak. Each starts at midnight in the quest owner’s time zone.",
  markUnavailable:
    "That can’t be changed. Only the last seven days, weeks or months since the task was added can be marked.",
  tasksHeading: "Tasks",
  // A quest's line above its one-off tasks, after its name.
  openCount: (count: number): string => `· ${count} open`,
  noTasks:
    "No open tasks. Add a task to a list in an Active quest to see it here. Recurring tasks show under Streaks.",
  tasksLegend:
    "Check off a task to mark it done. It stays here until midnight in the quest owner’s time zone, so it can be unchecked until then.",
} as const;
