// The text of the buddies page: the built-in buddies and the user's own,
// each with its actions.
import type { BuddyParts } from "@/buddies/buddy.ts";
import { pageTitle } from "@/ui/copy/site.ts";

// A part of a buddy's prompt as its page names it: its label, and what it
// does.
interface PartCopy {
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
  noOwn: "No buddies of your own yet. Customize one above to make one.",
  customize: "Customize",
  customizeLabel: (name: string): string => `Customize ${name}`,
  tweak: "Tweak",
  tweakLabel: (name: string): string => `Tweak ${name}`,
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
    "A built-in buddy can't be changed. Customize it to make a copy of your own, with every part below, and change that.",
  ownIntro:
    "Your buddy's prompt, part by part. Chats keep the buddy as it was when they started, so a change applies to new chats only.",
} as const;

// Each part of a buddy's prompt, by its key, so a part added to
// BuddyParts fails to compile here until it is named.
export const BUDDY_PARTS_COPY: Readonly<Record<keyof BuddyParts, PartCopy>> = {
  voice: {
    label: "Voice",
    help: "How the buddy talks: its heading, description and sample lines.",
  },
  habits: {
    label: "Habits",
    help: "How the buddy works with you in every chat, as a Markdown list.",
  },
};
