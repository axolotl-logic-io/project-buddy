// The text of the activities pages: the built-in activities and the user's
// own, each with its actions, and an activity's page.
import type { ActivityDefinition } from "@/activities/activity.ts";
import { pageTitle } from "@/ui/copy/site.ts";

// A part of an activity's prompt as its page names it: its label, and what
// it does.
interface FieldCopy {
  readonly label: string;
  readonly help: string;
}

export const ACTIVITIES_COPY = {
  title: pageTitle("Activities"),
  headerLink: "Activities",
  homeLink: "Home",
  heading: "Activities",
  intro:
    "An activity sets the scene an adventure plays out. Start an adventure in one, or let your construct move an adventure into one when it suits what you are doing.",
  loading: "Loading activities…",
  builtInHeading: "Built-in activities",
  ownHeading: "Your activities",
  noOwn:
    "No activities of your own yet. Customize one above, or choose New activity to write one from scratch.",
  newActivity: "Write new activity",
  // The name of an activity written from scratch, until the user renames it.
  newActivityName: "New activity",
  start: "Start",
  startLabel: (name: string): string => `Start an adventure in ${name}`,
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
  activitiesLink: "Activities",
  loading: "Loading activity…",
  builtInIntro:
    "A built-in activity can't be changed. Customize it to make a copy of your own, with the fields below, and change that.",
  ownIntro:
    "Your activity's instructions and opening request. Adventures keep the activity as it was when they entered it, so a change applies to adventures that enter it later.",
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
    help: "How your construct opens an adventure that starts in the activity, asked as if by you before its first message.",
  },
};
