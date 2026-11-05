// Validated legacy conversion preserves the old voice/habits rendering. Writes remain readable by the live build.
import { z } from "zod";
import type { ConstructDefinition } from "@/constructs/construct.ts";

const LEGACY = z.object({ voice: z.string(), habits: z.string() });
export const CONSTRUCT_DEFINITION = z.object({ prompt: z.string() });

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
  const { voice, habits } = legacy.data;
  if (habits === "") {
    return { prompt: voice };
  }
  return { prompt: [voice, "## Habits", habits].join("\n\n") };
}
export function storedConstructPrompt({
  prompt,
}: ConstructDefinition): unknown {
  return { voice: prompt, habits: "" };
}
