import type { ConstructVisual } from "@/constructs/visual.ts";

const CONSTRUCT_IDS = ["vellum", "lumen"] as const;

type ConstructId = (typeof CONSTRUCT_IDS)[number];

interface ConstructDefinition {
  readonly visual?: ConstructVisual | undefined;
}

// A built-in construct (src/constructs/). A quest names its
// construct by id.
interface Construct {
  readonly id: ConstructId;
  readonly name: string;
  readonly description: string;
  readonly definition: ConstructDefinition;
}

export type { Construct, ConstructId };
export { CONSTRUCT_IDS };
