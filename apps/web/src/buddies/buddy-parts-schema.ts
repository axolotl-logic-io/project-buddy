// The schema of a buddy's parts as stored in jsonb, in a chat's snapshot
// or a buddy of the user's own: its voice and habits, as text. A stored
// value that fails it is not a buddy's parts.
import { z } from "zod";
import type { BuddyParts } from "@/buddies/buddy.ts";

export const BUDDY_PARTS: z.ZodType<BuddyParts> = z.object({
  voice: z.string(),
  habits: z.string(),
});

// The stored value as a buddy's parts, or undefined when it is not one.
export function parseBuddyParts(stored: unknown): BuddyParts | undefined {
  const parsed = BUDDY_PARTS.safeParse(stored);
  if (!parsed.success) {
    return undefined;
  }
  return parsed.data;
}
