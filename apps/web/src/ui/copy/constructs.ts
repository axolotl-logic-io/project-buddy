// The text of the Constructs page: the built-in constructs and the user's own,
// each with its actions.
import type { ConstructDefinition } from "@/constructs/construct.ts";
import { pageTitle } from "@/ui/copy/site.ts";

// A part of a construct's instructions as its page names it: its label, and
// what it does.
interface FieldCopy {
  readonly label: string;
  readonly help: string;
}

export const CONSTRUCTS_COPY = {
  title: pageTitle("Constructs"),
  headerLink: "Constructs",
  homeLink: "Home",
  heading: "Constructs",
  intro:
    "Constructs are AI characters, each with a name, a voice and habits. Choose one when you start an adventure, or customize one to make your own.",
  loading: "Loading constructs…",
  builtInHeading: "Built-in constructs",
  ownHeading: "Your constructs",
  noOwn:
    "No constructs of your own yet. Customize one above, or choose New construct to write one from scratch.",
  newConstruct: "Write new construct",
  // The name of a construct written from scratch, until the user renames it.
  newConstructName: "New construct",
  startLabel: (name: string): string => `Adventure with ${name}`,
  customize: "Customize",
  customizeLabel: (name: string): string =>
    `Customize ${name}: make your own copy`,
  tweak: "Edit",
  tweakLabel: (name: string): string => `Edit your ${name}`,
  clone: "Clone",
  cloneLabel: (name: string): string => `Clone ${name}`,
} as const;

// The text of a construct's page: its instructions as named parts, editable
// for a construct of the user's own, read-only for a built-in one.
export const CONSTRUCT_COPY = {
  title: pageTitle("Construct"),
  constructsLink: "Constructs",
  loading: "Loading construct…",
  builtInIntro:
    "A built-in construct can't be changed. Customize it to make a copy of your own, with the fields below, and change that.",
  ownIntro:
    "Your construct's instructions. Adventures keep the construct as it was when they started, so a change applies to new adventures only.",
} as const;

// Conversational fields exposed by the prompt form. Visual metadata has its own editor.
export const CONSTRUCT_DEFINITION_COPY: Readonly<
  Record<keyof Pick<ConstructDefinition, "prompt">, FieldCopy>
> = {
  prompt: {
    label: "Prompt",
    help: "How the construct talks and works with you. Use voice and habits headings to organize it.",
  },
};
