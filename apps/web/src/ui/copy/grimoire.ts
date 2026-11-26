import { pageTitle } from "./site.ts";

const GRIMOIRE_COPY = {
  heading: "Grimoire",
  title: pageTitle("Grimoire"),
  create: "New rite",
  copy: "Make a copy",
  copyName: (name: string): string => `Copy of ${name}`,
  name: "Rite name",
  firstMessage: "First message",
  firstMessageHint:
    "The rite says this when a performance begins. It can use {rite} and {list}.",
  replies: "Replies",
  hint: "The rite answers each message with one of these, picked at random.",
  save: "Save rite",
  saved: "Rite saved.",
  cancel: "Cancel",
  forget: "Forget",
  restore: "Restore",
  delete: "Delete forever",
  searchLabel: "Find a rite",
  searchPlaceholder: "Find a rite…",
  filter: "Rites by source",
  builtInTag: "Built-in",
  // The word after a rite's count of replies.
  repliesAfterCount: (count: number): "reply" | "replies" => {
    if (count === 1) {
      return "reply";
    }
    return "replies";
  },
  // Says how many replies a rite has.
  replyCount: (count: number): string => {
    if (count === 1) {
      return "1 reply";
    }
    return `${count} replies`;
  },
  editedOn: (day: string): string => `Edited ${day}`,
  forgottenOn: (day: string): string => `Forgotten ${day}`,
  sources: {
    "built-in": "Built-in rite",
    own: "Your rite",
    forgotten: "Forgotten rite",
  },
  readOnly: "Read-only",
  placeholders: "Placeholders",
  placeholderMeanings: {
    rite: "the rite’s name",
    list: "the list’s name",
    text: "the message’s text",
    user: "the message’s author",
  },
  empty: "There are no rites in this collection.",
  emptyOwn:
    "You have no rites of your own yet. Choose New rite, or make a copy of a built-in rite.",
  emptyForgotten:
    "You have no forgotten rites. Forget one of your rites from its page to put it aside here.",
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
