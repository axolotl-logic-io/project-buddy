import type { ConstructDefinition } from "@/constructs/construct.ts";

// Prompt is retained only as a historical storage field.
function starterConstructDefinition(): ConstructDefinition {
  return { prompt: "" };
}

export { starterConstructDefinition };
