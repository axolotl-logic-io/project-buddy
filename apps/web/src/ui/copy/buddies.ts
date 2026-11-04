// The text of the buddies page: the built-in buddies and the user's own,
// each with its actions.
import type { BuddyDefinition } from "@/buddies/buddy.ts";
import { pageTitle } from "@/ui/copy/site.ts";

// A part of a buddy's prompt as its page names it: its label, and what it
// does.
interface FieldCopy {
  readonly label: string;
  readonly help: string;
}

export const BUDDIES_COPY = {
  title: pageTitle("Buddies"),
  headerLink: "Buddies",
  homeLink: "Home",
  heading: "Buddies",
  loading: "Loading buddies…",
  builtInHeading: "Built-in buddies",
  ownHeading: "Your buddies",
  noOwn:
    "No buddies of your own yet. Customize one above, or choose New buddy to write one from scratch.",
  newBuddy: "New buddy",
  // The name of a buddy written from scratch, until the user renames it.
  newBuddyName: "New buddy",
  customize: "Customize",
  customizeLabel: (name: string): string => `Customize ${name}`,
  tweak: "Tweak",
  tweakLabel: (name: string): string => `Tweak ${name}`,
  delete: "Delete",
  deleteLabel: (name: string): string => `Delete ${name}`,
  deleteTitle: "Delete this buddy?",
  deleteDescription: (name: string): string =>
    `“${name}” will be removed from your buddies. Existing chats keep their saved instructions. Published listings stay available until you unlist them from the Marketplace.`,
  deleteConfirm: "Delete buddy",
  deleteCancel: "Keep it",
  clone: "Clone",
  cloneLabel: (name: string): string => `Clone ${name}`,
} as const;

// The text of a buddy's page: its prompt as named parts, editable for a
// buddy of the user's own, read-only for a built-in one.
export const BUDDY_COPY = {
  title: pageTitle("Buddy"),
  buddiesLink: "Buddies",
  loading: "Loading buddy…",
  builtInIntro:
    "A built-in buddy can't be changed. Customize it to make a copy of your own, with the fields below, and change that.",
  ownIntro:
    "Your buddy's prompt. Chats keep the buddy as it was when they started, so a change applies to new chats only.",
} as const;

// Each part of a buddy's prompt, by its key, so a part added to
// BuddyDefinition fails to compile here until it is named.
export const BUDDY_DEFINITION_COPY: Readonly<
  Record<keyof BuddyDefinition, FieldCopy>
> = {
  prompt: {
    label: "Prompt",
    help: "How the buddy talks and works with you. Use voice and habits headings to organize it.",
  },
};
