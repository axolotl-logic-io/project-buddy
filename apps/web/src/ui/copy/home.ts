import { pageTitle } from "@/ui/copy/site.ts";

// Home, the signed-in landing page: the user's experience, then the
// streaks of every recurring task across their quests, then their tallies
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
  // A quest's line above its tasks, after its name.
  recurringCount: (count: number): string => `· ${count} recurring`,
  // A task's streak, under its number on a phone.
  streakUnit: (streak: number): "day" | "days" => {
    if (streak === 1) {
      return "day";
    }
    return "days";
  },
  // A square, by its accessible name; whether it is checked says whether
  // the task was done.
  square: (task: string, weekday: string, date: string): string =>
    `${task}, ${weekday} ${date}`,
  noStreaks:
    "No streaks yet. To count a task here, open its menu in a quest’s list and choose Make recurring.",
  legend:
    "Check a square to mark a task done on that day. A day without a check-off ends a streak. Each day starts at midnight in the quest owner’s time zone.",
  markUnavailable:
    "That day can’t be changed. Only the last seven days since the task was added can be marked.",
  tasksHeading: "Tasks",
  // A quest's line above its one-off tasks, after its name.
  openCount: (count: number): string => `· ${count} open`,
  noTasks:
    "No open tasks. Add a task to a list in an Active quest to see it here. Recurring tasks show under Streaks.",
  tasksLegend:
    "Check off a task to mark it done. It stays here until midnight in the quest owner’s time zone, so it can be unchecked until then.",
} as const;
