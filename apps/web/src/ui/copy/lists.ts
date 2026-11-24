import type { ListType } from "@/lists/list.ts";
import type { StreakChain } from "@/streaks/streaks.ts";

const LIST_NOUNS: Readonly<
  Record<ListType, { readonly one: string; readonly many: string }>
> = {
  plain: { one: "item", many: "items" },
  task: { one: "task", many: "tasks" },
  "quick-note": { one: "note", many: "notes" },
};

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
      "Use 1 to 200 characters on one line for items and tasks, or 1 to 1000 characters for notes.",
    unchanged: "Nothing changed.",
  },
  recurring: "Recurring",
  makeRecurring: "Make recurring",
  makeOneOff: "Make one-off",
  streakNote: ({ streak, doneToday }: StreakChain): string => {
    if (streak === 0) {
      return "Check it off to start a streak.";
    }
    if (doneToday) {
      return `${streak}-day streak.`;
    }
    return `${streak}-day streak. Check it off to make it ${streak + 1}.`;
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
  },
};

export { LISTS_COPY };
