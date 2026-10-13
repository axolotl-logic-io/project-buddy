// The text of the personas page: the built-in personas and the user's own,
// each with a button that clones it.
import type { PersonaParts } from "@/personas/persona.ts";
import { pageTitle } from "@/ui/copy/site.ts";

// A part of a persona's prompt as its page names it: its label, and what it
// does.
interface PartCopy {
  readonly label: string;
  readonly help: string;
}

export const PERSONAS_COPY = {
  title: pageTitle("Personas"),
  headerLink: "Personas",
  homeLink: "Home",
  heading: "Personas",
  loading: "Loading personas…",
  builtInHeading: "Built-in personas",
  ownHeading: "Your personas",
  noOwn: "No personas of your own yet. Clone one above to make one.",
  clone: "Clone",
  cloneLabel: (name: string): string => `Clone ${name}`,
} as const;

// The text of a persona's page: its prompt as named parts, editable for a
// persona of the user's own, read-only for a built-in one.
export const PERSONA_COPY = {
  title: pageTitle("Persona"),
  personasLink: "Personas",
  loading: "Loading persona…",
  builtInIntro:
    "A built-in persona can't be changed. Edit it to make a copy of your own, with every part below, and change that.",
  edit: "Edit a copy",
  ownIntro:
    "Your persona's prompt, part by part. Chats keep the persona as it was when they started, so a change applies to new chats only.",
  nameLabel: "Name",
  partsHeading: "Prompt parts",
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

// Each part of a persona's prompt, by its key, so a part added to
// PersonaParts fails to compile here until it is named.
export const PERSONA_PARTS_COPY: Readonly<
  Record<keyof PersonaParts, PartCopy>
> = {
  voice: {
    label: "Voice",
    help: "Who the tutor is: its heading, description and sample lines.",
  },
  teachingRules: {
    label: "Teaching rules",
    help: "This persona's own rules for teaching, as a Markdown list, after the shared rules.",
  },
  role: {
    label: "Role",
    help: "What the tutor is for. It opens the prompt.",
  },
  sharedRules: {
    label: "Shared rules",
    help: "The rules every persona starts with, so no voice bends the facts.",
  },
  citation: {
    label: "Citations",
    help: "How the tutor looks things up in the manual and cites it.",
  },
  interview: {
    label: "Project interview",
    help: "What the tutor asks in a project's first chat, while its memory lacks the basics.",
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
