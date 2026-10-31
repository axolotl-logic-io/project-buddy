// An activity is a skill that sets the scene a chat plays out, such as an
// interview or brainstorming. It is a prompt (src/prompts/prompt.ts): the
// site ships built-in activities, and the user can customize them into her
// own. A chat is in one activity at a time, its current activity, which can
// change during the chat (activity-sessions.ts).
import type { PromptSnapshot } from "@/prompts/prompt.ts";

export const ACTIVITY_IDS = [
  "open-chat",
  "interview",
  "brainstorming",
  "project-breakdown",
] as const;

export type ActivityId = (typeof ACTIVITY_IDS)[number];

// The activity a chat starts in when the user picks none.
export const DEFAULT_ACTIVITY_ID: ActivityId = "open-chat";

// The activity every new project's first chat starts in.
export const INTERVIEW_ACTIVITY_ID: ActivityId = "interview";

// An activity's parts, by name, as text. {{name}} in a part becomes the
// user's name.
export interface ActivityParts {
  // What the buddy does in the activity: the scene it sets for the chat
  // while it is the current activity.
  readonly instructions: string;
  // The user's side of a chat that starts in the activity, before the
  // buddy's opening: how the buddy opens it.
  readonly openingKickoff: string;
}

// An activity as a chat keeps it: its name and parts as they were when the
// chat entered it.
export type ActivitySnapshot = PromptSnapshot<ActivityParts>;

// A built-in activity.
export interface Activity extends ActivitySnapshot {
  readonly id: ActivityId;
  // One sentence about the activity for someone choosing one, which the
  // buddy also reads in its list of activities.
  readonly description: string;
}
