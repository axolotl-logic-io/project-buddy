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
  nameLabel: "Name",
  partsHeading: "Prompt parts",
  namePlaceholderHint:
    "Any {{name}} here is replaced with your name, as set on your account page, or “the user” if you have none.",
  mechanicsWarning:
    "The app relies on this part: changing it can break citations, the project's memory or search.",
  save: "Save",
  reset: "Reset to default",
  resetLabel: (part: string): string => `Reset ${part} to default`,
  fixedHeading: "Parts you can't change",
  dynamicHeading: "Filled in for each chat",
  dynamicIntro:
    "The prompt adds these for each chat, so they are always current:",
  dynamicParts: [
    "The project's memory, as it is when a reply starts.",
    "The project's name.",
    "Today's date.",
    "The version of the Blender manual the tutor searches.",
  ],
  toolFieldsHeading: "The tools' input fields",
  toolFieldsIntro:
    "The tutor fills in these fields when it uses a tool. Their descriptions are fixed, so the app can always read what it sends.",
  memoryTagsHeading: "The memory's tags",
  memoryTagsIntro:
    "The project's memory always sits between these tags, after the memory intro, so the tutor can tell it from the rest of the prompt.",
} as const;

// Each part of a buddy's prompt, by its key, so a part added to
// BuddyParts fails to compile here until it is named.
export const BUDDY_PARTS_COPY: Readonly<Record<keyof BuddyParts, PartCopy>> = {
  voice: {
    label: "Voice",
    help: "Who the tutor is: its heading, description and sample lines.",
  },
  teachingRules: {
    label: "Teaching rules",
    help: "This buddy's own rules for teaching, as a Markdown list, after the shared rules.",
  },
  role: {
    label: "Role",
    help: "What the tutor is for. It opens the prompt.",
  },
  sharedRules: {
    label: "Shared rules",
    help: "The rules every buddy starts with, so no voice bends the facts.",
  },
  citation: {
    label: "Citations",
    help: "How the tutor looks things up in the manual and cites it.",
  },
  brainstorming: {
    label: "Brainstorming",
    help: "How the buddy explores an idea, questions assumptions and helps you make decisions. Used when the Brainstorming extra is on.",
  },
  projectBreakdown: {
    label: "Project breakdown",
    help: "How the buddy turns a goal into milestones, dependencies and next steps. Used when the Project breakdown extra is on.",
  },
  interview: {
    label: "Project interview",
    help: "What the tutor asks in a project's first chat, while its memory lacks the basics.",
  },
  centralChat: {
    label: "Central chat",
    help: "What the tutor is told in the user's central chat, which belongs to no project.",
  },
  memoryIntro: {
    label: "Memory intro",
    help: "The line before the project's memory.",
  },
  emptyMemory: {
    label: "Empty memory",
    help: "The line the prompt gives instead while the project's memory is empty.",
  },
  searchManualTool: {
    label: "Search tool",
    help: "The description of the tool that searches the manual.",
  },
  citeManualTool: {
    label: "Citation tool",
    help: "The description of the tool that attaches manual links to a reply.",
  },
  updateMemoryTool: {
    label: "Memory tool",
    help: "The description of the tool that changes the project's memory.",
  },
  createProjectTool: {
    label: "New project tool",
    help: "The description of the tool that creates a project from the user's central chat.",
  },
  openingKickoff: {
    label: "Opening request",
    help: "The user's side of a chat before the tutor's opening message.",
  },
  neutralKickoff: {
    label: "Neutral start",
    help: "The turn every other call to the tutor starts with.",
  },
  answerNow: {
    label: "Answer-now note",
    help: "The note that asks for the answer when a reply's lookups end without one.",
  },
};
