import type { StreakChain } from "@/dailies/dailies.ts";

const SPACES_COPY = {
  heading: "Spaces",
  add: "Add space",
  settings: "Space settings",
  save: "Save space",
  saved: "Space saved.",
  unavailable: "This space is unavailable.",
  invalidChange: "This change is invalid.",
  changeProblems: {
    missing: "This space or murmling is unavailable.",
    "invalid-text":
      "Use 1 to 200 characters on one line for plain murmlings and tasks, or 1 to 1000 characters for quick notes.",
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
  checked: (
    space: { readonly checkOff: string; readonly uncheck: string },
    checkedOff: boolean,
  ): string => {
    if (checkedOff) {
      return `${space.checkOff}: saved.`;
    }
    return `${space.uncheck}: saved.`;
  },
  savedChange: "Change saved.",
  addMurmling: (noun: string): string => `Add ${noun}`,
  editMurmling: (noun: string): string => `Edit ${noun}`,
  removeMurmling: (noun: string): string => `Remove ${noun}`,
  markAs: (type: string): string => `Mark as ${type.toLowerCase()}`,
  moveUp: "Move up",
  moveDown: "Move down",
  moveTo: "Move to another space",
  destination: "Destination space",
  move: "Move",
  done: "Done",
  saveEdit: "Save",
  cancelEdit: "Cancel",
  actions: (noun: string): string => `Actions for this ${noun}`,
  taskNumber: (number: number): string => `Task #${number}`,
  fields: {
    name: "Space name",
    singular: "Singular noun",
    plural: "Plural noun",
    checkOff: "Check-off verb",
    uncheck: "Uncheck verb",
    newType: "Type for new murmlings",
  },
  types: {
    plain: "Plain",
    task: "Task",
    "quick-note": "Quick note",
  },
};

export { SPACES_COPY };
