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
    "No activities of your own yet. Make a copy of a built-in one, or choose Create activity to make one without copying another.",
  newActivity: "Create activity",
  // The name of a crafted activity, until the user renames it.
  newActivityName: "New activity",
  customize: "Make a copy",
  customizeLabel: (name: string): string => `Make a copy of ${name}`,
  tweak: "Edit",
  tweakLabel: (name: string): string => `Edit your ${name}`,
  clone: "Make a copy",
  cloneLabel: (name: string): string => `Make a copy of ${name}`,
} as const;

// The text of an activity's page: its prompt as named parts, editable for an
// activity of the user's own, read-only for a built-in one.
export const ACTIVITY_COPY = {
  title: pageTitle("Activity"),
  loading: "Loading activity…",
  builtInIntro:
    "A built-in activity can't be changed. Choose Make a copy to edit your own version.",
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
