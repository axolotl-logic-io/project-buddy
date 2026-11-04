// Validated legacy conversion preserves the old voice/habits rendering. Writes remain readable by the live build.
import { z } from "zod";
import type { BuddyDefinition } from "@/buddies/buddy.ts";

const LEGACY = z.object({ voice: z.string(), habits: z.string() });
export const BUDDY_DEFINITION = z.object({ prompt: z.string() });

export function parseBuddyDefinition(
  stored: unknown,
): BuddyDefinition | undefined {
  const current = BUDDY_DEFINITION.safeParse(stored);
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
export function storedBuddyPrompt({ prompt }: BuddyDefinition): unknown {
  return { voice: prompt, habits: "" };
}
