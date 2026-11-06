import type { NamedDefinition } from "@/prompts/prompt.ts";

export const ACTIVITY_IDS = [
  "open-chat",
  "interview",
  "brainstorming",
  "project-breakdown",
  "find-something-to-make",
] as const;

export type ActivityId = (typeof ACTIVITY_IDS)[number];

export const DEFAULT_ACTIVITY_ID: ActivityId = "open-chat";

export const INTERVIEW_ACTIVITY_ID: ActivityId = "interview";

export interface ActivityDefinition {
  readonly prompt: string;
  readonly openingRequest: string;
}

export type ActivitySnapshot = NamedDefinition<ActivityDefinition>;

export interface Activity extends ActivitySnapshot {
  readonly id: ActivityId;
  readonly description: string;
}
