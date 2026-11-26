import type { ListType } from "@/lists/list.ts";
import type { StreakChain } from "@/streaks/streaks.ts";
import { CADENCE_COPY } from "./cadence.ts";
import { LISTS_COPY } from "./lists.ts";

const QUEST_OVERVIEW_COPY = {
  back: "Back to overview",
  backToSettings: "Back to Quest settings",
  quest: "Quest",
  status: "Quest status",
  private: "Private",
  today: "Today",
  // Under Today's heading: how many of its recurring tasks are still to do
  // in their current day, week or month.
  todayLeft: (left: number, total: number): string =>
    `${left} of ${total} left`,
  // A recurring task's streak beside it under Today, and whether checking
  // it off in its current day, week or month keeps the streak going.
  streak: ({ cadence, streak, doneNow }: StreakChain): string => {
    if (streak === 0) {
      return "No streak yet";
    }
    const length = CADENCE_COPY.streak(cadence, streak);
    if (doneNow) {
      return length;
    }
    return `${length} · keep it going`;
  },
  // A list card's link to the list, past the items it shows.
  more: (count: number, list: string): string => `${count} more in ${list}`,
  // A list card's button that opens the editor for a new list item.
  addTo: (type: ListType, list: string): string =>
    `${LISTS_COPY.addListItem(type)} to ${list}`,
  performRite: "Perform a rite",
  // A list card's button, named for its list, that opens the rite dialog.
  performRiteOn: (list: string): string => `Perform a rite on ${list}`,
  rite: {
    // Under the dialog's title, the list the rite will be performed on.
    on: (list: string): string => `on ${list}`,
    builtIn: "Built in",
    own: "Yours",
    cancel: "Cancel",
    close: "Close",
  },
  settings: "Quest settings",
  // Under the quest panel's link to the quest's settings.
  settingsHint: "Members, Day grid and the quest’s status",
  // The panel beside the quest, with its settings link and the Timer.
  panel: {
    label: "Quest panel",
    expand: "Open quest panel",
    collapse: "Close quest panel",
  },
  members: (count: number): string => `Members (${count})`,
  // A list's size beside its name: a task list counts its open tasks, and
  // any other list counts all its items.
  listSize: (
    type: ListType,
    { total, open }: { readonly total: number; readonly open: number },
  ): string => {
    if (type === "task") {
      return `${open} open`;
    }
    const { one, many } = LISTS_COPY.nouns(type);
    if (total === 1) {
      return `1 ${one}`;
    }
    return `${total} ${many}`;
  },
};

export { QUEST_OVERVIEW_COPY };
