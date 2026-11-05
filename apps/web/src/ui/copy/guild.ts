// The text of the Guild page: the built-in constructs and the user's own,
// each with its actions.
import type { ConstructDefinition } from "@/constructs/construct.ts";
import { pageTitle } from "@/ui/copy/site.ts";

// A part of a construct's instructions as its page names it: its label, and
// what it does.
interface FieldCopy {
  readonly label: string;
  readonly help: string;
}

export const GUILD_COPY = {
  title: pageTitle("Guild"),
  headerLink: "Guild",
  homeLink: "Home",
  heading: "Guild",
  intro:
    "Your guildmates are constructs: AI guildmates, each with a name, a voice and habits. Choose one when you start a chat, or customize one to make your own.",
  loading: "Loading the Guild…",
  builtInHeading: "Built-in constructs",
  ownHeading: "Your constructs",
  noOwn:
    "No constructs of your own yet. Customize one above, or choose New construct to write one from scratch.",
  newConstruct: "New construct",
  // The name of a construct written from scratch, until the user renames it.
  newConstructName: "New construct",
  customize: "Customize",
  customizeLabel: (name: string): string => `Customize ${name}`,
  tweak: "Tweak",
  tweakLabel: (name: string): string => `Tweak ${name}`,
  delete: "Delete",
  deleteLabel: (name: string): string => `Delete ${name}`,
  deleteTitle: "Delete this construct?",
  deleteDescription: (name: string): string =>
    `“${name}” will be removed from your constructs. Existing chats keep their saved instructions.`,
  deleteConfirm: "Delete construct",
  deleteCancel: "Keep it",
  clone: "Clone",
  cloneLabel: (name: string): string => `Clone ${name}`,
} as const;

// The text of a construct's page: its instructions as named parts, editable
// for a construct of the user's own, read-only for a built-in one.
export const CONSTRUCT_COPY = {
  title: pageTitle("Construct"),
  guildLink: "Guild",
  loading: "Loading construct…",
  builtInIntro:
    "A built-in construct can't be changed. Customize it to make a copy of your own, with the fields below, and change that.",
  ownIntro:
    "Your construct's instructions. Chats keep the construct as it was when they started, so a change applies to new chats only.",
} as const;

// Each part of a construct's instructions, by its key, so a part added to
// ConstructDefinition fails to compile here until it is named.
export const CONSTRUCT_DEFINITION_COPY: Readonly<
  Record<keyof ConstructDefinition, FieldCopy>
> = {
  prompt: {
    label: "Prompt",
    help: "How the construct talks and works with you. Use voice and habits headings to organize it.",
  },
};
