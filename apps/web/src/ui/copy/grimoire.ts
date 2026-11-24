import { pageTitle } from "./site.ts";

const GRIMOIRE_COPY = {
  heading: "Grimoire",
  title: pageTitle("Grimoire"),
  create: "Create rite",
  copy: "Make a copy",
  copyName: (name: string): string => `Copy of ${name}`,
  view: "View",
  edit: "Edit",
  name: "Rite name",
  firstMessage: "First message",
  firstMessageHint:
    "The rite says this when a performance begins. Use {rite} and {list} in it.",
  replies: "Replies",
  hint: "Use {rite}, {list}, {text} and {user} in replies.",
  save: "Save rite",
  saved: "Rite saved.",
  cancel: "Cancel",
  forget: "Forget",
  restore: "Restore",
  delete: "Delete forever",
  search: "Search rites",
  filter: "Show rites",
  find: "Search",
  empty: "There are no rites in this collection.",
  emptyForgotten:
    "You have no forgotten rites. Forget one of your rites from its page to put it aside here.",
  forgottenOn: (day: string): string => `Forgotten ${day}`,
  confirmDelete: (name: string): string => `Delete “${name}” forever?`,
  confirmDeleteDetail:
    "The rite is removed for good and can’t be restored. Performances that used it keep their rite snapshots.",
  keepForgotten: "Keep forgotten",
  changed: {
    forget: (name: string): string =>
      `“${name}” is forgotten. Restore it here, or delete it forever.`,
    restore: (name: string): string =>
      `“${name}” is restored and back among your rites.`,
    delete: "The rite is deleted forever.",
  },
  noMatches: "No rites match your search.",
  unavailable: "This rite is unavailable.",
  invalidName: "Enter a rite name of up to 80 characters on one line.",
  invalidFirstMessage: "Enter a first message of up to 5000 characters.",
  invalidReplies:
    "Enter at least one reply. Use up to 50 replies of 5000 characters each.",
  filters: {
    all: "All",
    "built-in": "Built-in",
    own: "Yours",
    forgotten: "Forgotten",
  },
};

export { GRIMOIRE_COPY };
