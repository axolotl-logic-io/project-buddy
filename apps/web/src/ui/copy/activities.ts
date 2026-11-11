// The text of the Workshop's activities list: the built-in activities and the
// user's own, each with its actions, and an activity's page.
import type { ActivityDefinition } from "@/activities/activity.ts";
import { pageTitle } from "@/ui/copy/site.ts";

// A part of an activity's prompt as its page names it: its label, and what
// it does.
interface FieldCopy {
  readonly label: string;
  readonly help: string;
}

export const ACTIVITIES_COPY = {
  builtInHeading: "Built-in activities",
  ownHeading: "Your activities",
  noOwn:
    "No activities of your own yet. Customize a built-in one, or choose Craft activity to make one without copying another.",
  newActivity: "Craft activity",
  // The name of a crafted activity, until the user renames it.
  newActivityName: "New activity",
  customize: "Customize",
  customizeLabel: (name: string): string =>
    `Customize ${name}: make your own copy`,
  tweak: "Edit",
  tweakLabel: (name: string): string => `Edit your ${name}`,
  clone: "Clone",
  cloneLabel: (name: string): string => `Clone ${name}`,
} as const;

// The text of an activity's page: its prompt as named parts, editable for an
// activity of the user's own, read-only for a built-in one.
export const ACTIVITY_COPY = {
  title: pageTitle("Activity"),
  loading: "Loading activity…",
  builtInIntro:
    "A built-in activity can't be changed. Customize it to make a copy of your own, with the fields below, and change that.",
  ownIntro:
    "Your activity's instructions and opening request. A conversation keeps the activity as it was when it entered it, so a change applies to conversations that enter it later.",
} as const;

// Each part of an activity's prompt, by its key, so a part added to
// ActivityDefinition fails to compile here until it is named.
export const ACTIVITY_DEFINITION_COPY: Readonly<
  Record<keyof ActivityDefinition, FieldCopy>
> = {
  prompt: {
    label: "Instructions",
    help: "The name identifies the activity; the Activity Sheet contains its instructions: what your construct does and the scene it sets.",
  },
  openingRequest: {
    label: "Opening request",
    help: "How your construct opens a quest that starts in the activity, asked as if by you before its first message.",
  },
};
