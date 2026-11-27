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
  // A recurring task's streak under its text in its list's section, and
  // whether checking it off in its current day, week or month keeps the
  // streak going.
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
  // A list section's link to the list, past the items it shows.
  more: (count: number, list: string): string => `${count} more in ${list}`,
  // A list section's button that opens its editor for new list items, and
  // the editor's field, named for its list.
  addTo: (type: ListType, list: string): string =>
    `${LISTS_COPY.addListItem(type)} to ${list}`,
  // The editor above a list section's items.
  adder: {
    add: "Add",
    done: "Done",
    hint: "Enter adds and keeps this open. Escape closes it.",
  },
  // The add box under the quest's name, which adds to any of its lists.
  addBox: {
    label: "Add to a list",
    add: "Add",
    target: "Add to",
    newList: "New list",
    nameList: "Name the new list",
    nameProblem: "Name the list in 1 to 80 characters on one line.",
    hint: "Enter adds to the list marked in gold, and the box stays ready for the next one.",
    namingHint: "Enter makes a task list with this name. Escape goes back.",
    added: (text: string, list: string): string =>
      `Added “${text}” to ${list}.`,
    made: (list: string): string => `Made ${list}. Enter now adds to it.`,
  },
  performRite: "Perform a rite",
  // A list section's candle button, named for its list, that opens the
  // rite dialog.
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
