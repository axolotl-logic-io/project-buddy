import type { NamedDefinition } from "@/prompts/prompt.ts";

export const CONSTRUCT_IDS = ["vellum", "lumen"] as const;

export type ConstructId = (typeof CONSTRUCT_IDS)[number];

export interface ConstructDefinition {
  readonly prompt: string;
}

export type ConstructSnapshot = NamedDefinition<ConstructDefinition>;

export interface Construct extends ConstructSnapshot {
  readonly id: ConstructId;
  readonly description: string;
}
