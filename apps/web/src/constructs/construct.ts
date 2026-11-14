import type { ConstructVisual } from "@/constructs/visual.ts";
import type { NamedDefinition } from "@/prompts/prompt.ts";

export const CONSTRUCT_IDS = ["vellum", "lumen"] as const;

export type ConstructId = (typeof CONSTRUCT_IDS)[number];

export interface ConstructDefinition {
  // Historical storage only; the local engine does not interpret it.
  readonly prompt: string;
  readonly visual?: ConstructVisual | undefined;
}

export type ConstructSnapshot = NamedDefinition<ConstructDefinition>;

export interface Construct extends ConstructSnapshot {
  readonly id: ConstructId;
  readonly description: string;
}
