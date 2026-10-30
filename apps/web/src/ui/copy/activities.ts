// The text of the activities pages: the built-in activities and the user's
// own, each with its actions, and an activity's page.
import type { ActivityParts } from "@/activities/activity.ts";
import { pageTitle } from "@/ui/copy/site.ts";

// A part of an activity's prompt as its page names it: its label, and what
// it does.
interface PartCopy {
  readonly label: string;
  readonly help: string;
}

export const ACTIVITIES_COPY = {
  title: pageTitle("Activities"),
  headerLink: "Activities",
  homeLink: "Home",
  heading: "Activities",
  intro:
    "An activity sets the scene a chat plays out. Start a chat in one, or let the buddy move a chat into one when it suits what you are doing.",
  loading: "Loading activities…",
  builtInHeading: "Built-in activities",
  ownHeading: "Your activities",
  noOwn: "No activities of your own yet. Customize one above to make one.",
  start: "Start",
  startLabel: (name: string): string => `Start a chat in ${name}`,
  customize: "Customize",
  customizeLabel: (name: string): string => `Customize ${name}`,
  tweak: "Tweak",
  tweakLabel: (name: string): string => `Tweak ${name}`,
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
    "A built-in activity can't be changed. Customize it to make a copy of your own, with every part below, and change that.",
  ownIntro:
    "Your activity's prompt, part by part. Chats keep the activity as it was when they entered it, so a change applies to chats that enter it later.",
} as const;

// Each part of an activity's prompt, by its key, so a part added to
// ActivityParts fails to compile here until it is named.
export const ACTIVITY_PARTS_COPY: Readonly<
  Record<keyof ActivityParts, PartCopy>
> = {
  instructions: {
    label: "Instructions",
    help: "What the buddy does in the activity: the scene it sets for the chat.",
  },
  openingKickoff: {
    label: "Opening request",
    help: "How the buddy opens a chat that starts in the activity, asked as if by you before its first message.",
  },
};
