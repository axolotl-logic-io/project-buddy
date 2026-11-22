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
  replies: "Replies",
  hint: "Use {rite}, {space}, {singular}, {plural}, {text} and {user} in replies.",
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
  noMatches: "No rites match your search.",
  unavailable: "This rite is unavailable.",
  invalidName: "Enter a rite name of up to 80 characters on one line.",
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
