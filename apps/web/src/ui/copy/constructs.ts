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
  heading: "Constructs",
  builtInHeading: "Built-in constructs",
  ownHeading: "Your constructs",
  noOwn:
    "No constructs of your own yet. Make a copy of a built-in one, or choose Create construct to make one without copying another.",
  newConstruct: "Create construct",
  // The name of a crafted construct, until the user renames it.
  newConstructName: "New construct",
  customize: "Make a copy",
  customizeLabel: (name: string): string => `Make a copy of ${name}`,
  tweak: "Edit",
  tweakLabel: (name: string): string => `Edit your ${name}`,
  clone: "Make a copy",
  cloneLabel: (name: string): string => `Make a copy of ${name}`,
} as const;

// The text of a construct's page: its instructions as named parts, editable
// for a construct of the user's own, read-only for a built-in one.
export const CONSTRUCT_COPY = {
  title: pageTitle("Construct"),
  constructsLink: "Constructs",
  loading: "Loading construct…",
  builtInIntro:
    "A built-in construct can't be changed. Choose Make a copy to edit your own version.",
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
