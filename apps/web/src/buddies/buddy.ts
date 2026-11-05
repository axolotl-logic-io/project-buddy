import type { NamedDefinition } from "@/prompts/prompt.ts";

export const BUDDY_IDS = ["vellum", "lumen"] as const;

export type BuddyId = (typeof BUDDY_IDS)[number];

export interface BuddyDefinition {
  readonly prompt: string;
}

export type BuddySnapshot = NamedDefinition<BuddyDefinition>;

export interface Buddy extends BuddySnapshot {
  readonly id: BuddyId;
  readonly description: string;
}
