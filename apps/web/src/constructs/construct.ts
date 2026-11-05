import type { NamedDefinition } from "@/prompts/prompt.ts";

export const CONSTRUCT_IDS = [
  "hippy",
  "mr-tee",
  "fjord-tines",
  "span-tines",
  "argon-sprangler",
  "roland-dustchain",
] as const;

export type ConstructId = (typeof CONSTRUCT_IDS)[number];

export interface ConstructDefinition {
  readonly prompt: string;
}

export type ConstructSnapshot = NamedDefinition<ConstructDefinition>;

export interface Construct extends ConstructSnapshot {
  readonly id: ConstructId;
  readonly description: string;
}
