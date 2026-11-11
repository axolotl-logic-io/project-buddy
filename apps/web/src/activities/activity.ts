import type { NamedDefinition } from "@/prompts/prompt.ts";

export const ACTIVITY_IDS = [
  "open-chat",
  "interview",
  "brainstorming",
  "project-breakdown",
  "find-something-to-make",
  "dailies",
  "learn-a-thing",
] as const;

export type ActivityId = (typeof ACTIVITY_IDS)[number];

export const DEFAULT_ACTIVITY_ID: ActivityId = "open-chat";

export const INTERVIEW_ACTIVITY_ID: ActivityId = "interview";

// The activity of the one ongoing Dailies quest, whose instructions guide
// each Start the day.
export const DAILIES_ACTIVITY_ID: ActivityId = "dailies";

export interface ActivityDefinition {
  readonly prompt: string;
  readonly openingRequest: string;
}

export type ActivitySnapshot = NamedDefinition<ActivityDefinition>;

export interface Activity extends ActivitySnapshot {
  readonly id: ActivityId;
  readonly description: string;
}
