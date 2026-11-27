// The text of Quests, the New quest form and a quest's overview page.
import { pageTitle } from "@/ui/copy/site.ts";

export const QUESTS_COPY = {
  title: pageTitle("Quests"),
  headerLink: "Quests",
  heading: "Quests",
  none: "No quests with this status.",
  needsName: "A quest needs a name.",
  nameTooLong: (maxLength: number): string =>
    `Use a shorter name, of at most ${maxLength} characters.`,
  motivationLabel: "Why do you want to complete this quest?",
  motivationHint:
    "Optional. Tell your construct what makes this quest matter to you.",
} as const;

export const QUEST_COPY = {
  rename: "Rename",
  titleLabel: "Quest title",
  saveTitle: "Save title",
  cancelTitle: "Cancel title edit",
  titleSaved: "Quest title saved.",
} as const;

// Starting a new quest (src/components/new-quest.tsx).
export const NEW_QUEST_COPY = {
  open: "New quest",
  title: "New quest",
  close: "Cancel the new quest",
  nameLabel: "Name",
  start: "Start quest",
  starting: "Starting the quest…",
  invalid: "Check the quest’s name and try again.",
} as const;

// Life, pinned at the top of Quests (src/components/life-pin.tsx).
export const LIFE_COPY = {
  open: "Open",
  openLabel: (name: string): string => `Open ${name}`,
  progress: (done: number, total: number): string => {
    if (total === 0) {
      return "No recurring tasks yet";
    }
    if (done === total) {
      return `All ${total} recurring done today`;
    }
    return `${done} of ${total} recurring done today`;
  },
  suggested: "Suggested",
} as const;

// Finding a quest or a task on Quests (src/components/quest-finder.tsx).
export const QUEST_FINDER_COPY = {
  searchLabel: "Find a quest or task",
  searchPlaceholder: "Find a quest or task…",
  statuses: "Quests by status",
  shared: "Shared",
  sortLabel: "Sort",
  sorts: {
    activity: "Recent activity",
    name: "Name",
    newest: "Newest",
  },
  running: (rite: string): string => `${rite} running`,
  justNow: "just now",
  resting: "Resting",
  active: (when: string): string => `active ${when}`,
  restingFor: (days: number): string => `no activity for ${days} days`,
  doneThisWeek: (count: number): string => `${count} done this week`,
  // After a quest's count of open tasks, set apart from it.
  open: "open",
  openTasks: (count: number): string => {
    if (count === 1) {
      return "1 open task";
    }
    return `${count} open tasks`;
  },
  questsHeading: "Quests",
  tasksHeading: "Tasks",
  taskCounts: (open: number, doneNow: number): string =>
    `${open} open · ${doneNow} done today`,
  noQuests: "No quests match.",
  noTasks: "No tasks match.",
  noneShared: "No shared quests with this status.",
  showEarlier: (count: number): string => {
    if (count === 1) {
      return "Show 1 task checked off earlier";
    }
    return `Show ${count} tasks checked off earlier`;
  },
  hideEarlier: "Hide tasks checked off earlier",
  openTask: "Open",
  openTaskLabel: (quest: string): string => `Open ${quest}`,
} as const;
