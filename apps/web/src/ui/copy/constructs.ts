// The text of the Constructs page: the built-in constructs and the user's own,
// each with its actions.
import { pageTitle } from "@/ui/copy/site.ts";

export const CONSTRUCTS_COPY = {
  heading: "Constructs",
  builtInHeading: "Built-in constructs",
  ownHeading: "Your constructs",
  noOwn:
    "No constructs of your own yet. Make a copy of a built-in one, or choose Create construct to make one without copying another.",
  intro:
    "Create or copy a construct, then customize its name and Visual description.",
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
    "Edit your construct’s name and Visual description. Quests keep the name and appearance saved when they started.",
} as const;
