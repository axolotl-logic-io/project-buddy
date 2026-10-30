// The schema of an activity's parts as stored in jsonb, in an activity
// session's snapshot or an activity of the user's own: every part of
// ActivityParts, as text. A stored value that fails it is not an activity's
// parts.
import { z } from "zod";
import type { ActivityParts } from "@/activities/activity.ts";

export const ACTIVITY_PARTS: z.ZodType<ActivityParts> = z.object({
  instructions: z.string(),
  openingKickoff: z.string(),
});

// The stored value as an activity's parts, or undefined when it is not one.
export function parseActivityParts(stored: unknown): ActivityParts | undefined {
  const parsed = ACTIVITY_PARTS.safeParse(stored);
  if (!parsed.success) {
    return undefined;
  }
  return parsed.data;
}
