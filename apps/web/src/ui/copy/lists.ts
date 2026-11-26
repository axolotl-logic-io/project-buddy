import type { SplitCopy } from "@/components/ui/editable-list-contract.ts";
import type { ListType } from "@/lists/list.ts";
import type { StreakChain } from "@/streaks/streaks.ts";
import { CADENCE_COPY } from "./cadence.ts";

const LIST_NOUNS: Readonly<
  Record<ListType, { readonly one: string; readonly many: string }>
> = {
  plain: { one: "item", many: "items" },
  task: { one: "task", many: "tasks" },
  "quick-note": { one: "note", many: "notes" },
  tally: { one: "tally", many: "tallies" },
};

function capitalized(word: string): string {
  return `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
}

const LISTS_COPY = {
  heading: "Lists",
  add: "Add list",
  settings: "List settings",
  save: "Save list",
  saved: "List saved.",
  unavailable: "This list is unavailable.",
  invalidChange: "This change is invalid.",
  changeProblems: {
    missing: "This list or item is unavailable.",
    "invalid-text":
      "Use 1 to 200 characters on one line for items, tasks and tallies, or 1 to 1000 characters for notes.",
    unchanged: "Nothing changed.",
  },
  makeOneOff: "Make one-off",
  streakNote: ({ cadence, streak, doneNow }: StreakChain): string => {
    if (streak === 0) {
      return "Check it off to start a streak.";
    }
    const length = CADENCE_COPY.streak(cadence, streak);
    if (doneNow) {
      return `${length}.`;
    }
    return `${length}. Check it off to make it ${streak + 1}.`;
  },
  saveFailed: "The change could not be saved. Try again.",
  undo: "Undo",
  checkOff: "Check off",
  uncheck: "Uncheck",
  checkedOff: "Task checked off.",
  unchecked: "Task unchecked.",
  savedChange: "Change saved.",
  addListItem: (type: ListType): string => `Add ${LIST_NOUNS[type].one}`,
  editListItem: (type: ListType): string => `Edit ${LIST_NOUNS[type].one}`,
  removeListItem: (type: ListType): string => `Remove ${LIST_NOUNS[type].one}`,
  splitListItem: (type: ListType): string => `Split ${LIST_NOUNS[type].one}`,
  splitDone: (type: ListType, count: number): string =>
    `${capitalized(LIST_NOUNS[type].one)} split into ${count} ${LIST_NOUNS[type].many}.`,
  // The split dialog's words for a list item of the list's type.
  split: (type: ListType): SplitCopy => {
    const { one, many } = LIST_NOUNS[type];
    return {
      title: `Split ${one}`,
      description: `Write each part as its own ${one}. The parts replace this ${one}, in its place.`,
      original: `This ${one}`,
      parts: `New ${many}`,
      part: (number: number): string => `${capitalized(one)} ${number}`,
      removePart: (number: number): string => `Remove ${one} ${number}`,
      addPart: `Add another ${one}`,
      pasteHint: `Paste several lines to make a ${one} of each.`,
      submit: (count: number): string => `Split into ${count} ${many}`,
      cancel: "Cancel",
      close: "Close",
      failed: "The split couldn’t be saved. Try again.",
    };
  },
  moveUp: "Move up",
  moveDown: "Move down",
  moveTo: "Move to another list",
  destination: "Destination list",
  move: "Move",
  done: "Done",
  saveEdit: "Save",
  cancelEdit: "Cancel",
  actions: (type: ListType): string =>
    `Actions for this ${LIST_NOUNS[type].one}`,
  // What a list calls its items, by the list's type.
  nouns: (type: ListType): { readonly one: string; readonly many: string } =>
    LIST_NOUNS[type],
  typeTooLong:
    "Some items are too long for that type. Shorten them to one line of 200 characters or fewer first.",
  taskNumber: (number: number): string => `Task #${number}`,
  fields: {
    name: "List name",
    type: "Type",
  },
  types: {
    plain: "Items",
    task: "Tasks",
    "quick-note": "Notes",
    tally: "Tallies",
  },
};

export { LISTS_COPY };
