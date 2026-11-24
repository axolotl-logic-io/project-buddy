import { pageTitle } from "@/ui/copy/site.ts";

// Home, the signed-in landing page: the user's experience, then the
// streaks of every recurring task across their Dailies quests, and the site
// panel's link to it.
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
    "No streaks yet. In a Dailies quest, make a task recurring and start a day to count it here.",
  noDays: "Start Day in a Dailies quest begins counting its recurring tasks.",
  legend:
    "Check a square to mark a task done on that day. A dashed square is a day you didn’t start, which ends a streak.",
  markUnavailable:
    "That day can’t be changed. Only a day you started can record a recurring task.",
} as const;
