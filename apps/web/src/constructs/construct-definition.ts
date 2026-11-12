// Validated conversion preserves the rendering of historical voice and habits.

import { z } from "zod";
import type { ConstructDefinition } from "@/constructs/construct.ts";

import { CONSTRUCT_VISUAL } from "@/constructs/visual.ts";

const VISUAL_METADATA = CONSTRUCT_VISUAL.optional().catch(undefined);
const LEGACY = z.object({
  voice: z.string(),
  habits: z.string(),
  visual: VISUAL_METADATA,
});
export const CONSTRUCT_DEFINITION = z.object({
  prompt: z.string(),
  visual: VISUAL_METADATA,
});

export function parseConstructDefinition(
  stored: unknown,
): ConstructDefinition | undefined {
  const current = CONSTRUCT_DEFINITION.safeParse(stored);
  if (current.success) {
    return current.data;
  }
  const legacy = LEGACY.safeParse(stored);
  if (!legacy.success) {
    return undefined;
  }
  const { voice, habits, visual } = legacy.data;
  if (habits === "") {
    return { prompt: voice, visual };
  }
  return { prompt: [voice, "## Habits", habits].join("\n\n"), visual };
}
export function storedConstructPrompt({
  prompt,
  visual,
}: ConstructDefinition): unknown {
  return { voice: prompt, habits: "", visual };
}
