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
  heading: "Constructs",
  intro:
    "Constructs are AI characters, each with a name, a voice and habits. Choose one when you start a quest, or customize one to make your own.",
  loading: "Loading constructs…",
  builtInHeading: "Built-in constructs",
  ownHeading: "Your constructs",
  noOwn:
    "No constructs of your own yet. Customize a built-in one, or choose Craft construct to make one without copying another.",
  newConstruct: "Craft construct",
  // The name of a crafted construct, until the user renames it.
  newConstructName: "New construct",
  startLabel: (name: string): string => `Start a quest with ${name}`,
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
    "Your construct's instructions. A quest keeps the construct as it was when the quest started, so a change applies to new quests only.",
} as const;

// Conversational fields exposed by the prompt form. Visual metadata has its own editor.
export const CONSTRUCT_DEFINITION_COPY: Readonly<
  Record<keyof Pick<ConstructDefinition, "prompt">, FieldCopy>
> = {
  prompt: {
    label: "Prompt",
    help: "The name identifies the construct; the Character Sheet contains its instructions. Use voice and habits headings to organize how it talks and works with you.",
  },
};
