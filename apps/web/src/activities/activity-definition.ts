// Validated storage conversion separates the activity prompt from its opening request while preserving the live JSON format.

import { z } from "zod";
import type { ActivityDefinition } from "@/activities/activity.ts";

export const ACTIVITY_DEFINITION: z.ZodType<ActivityDefinition> = z.object({
  prompt: z.string(),
  openingRequest: z.string(),
});

export function parseActivityDefinition(
  stored: unknown,
): ActivityDefinition | undefined {
  const legacy = z
    .object({ instructions: z.string(), openingKickoff: z.string() })
    .safeParse(stored);
  if (legacy.success) {
    return {
      prompt: legacy.data.instructions,
      openingRequest: legacy.data.openingKickoff,
    };
  }
  const parsed = ACTIVITY_DEFINITION.safeParse(stored);
  if (!parsed.success) {
    return undefined;
  }
  return parsed.data;
}

export function storedActivityPrompt(text: ActivityDefinition): unknown {
  return { instructions: text.prompt, openingKickoff: text.openingRequest };
}
