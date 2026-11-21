import type { ConstructVisual } from "@/constructs/visual.ts";

export const CONSTRUCT_IDS = ["vellum", "lumen"] as const;

export type ConstructId = (typeof CONSTRUCT_IDS)[number];

export interface ConstructDefinition {
  readonly visual?: ConstructVisual | undefined;
}

// A built-in construct (src/constructs/). A conversation names its
// construct by id.
export interface Construct {
  readonly id: ConstructId;
  readonly name: string;
  readonly description: string;
  readonly definition: ConstructDefinition;
}
