// The schema of a buddy's parts as stored in jsonb, in a chat's snapshot
// or a buddy of the user's own: its voice and habits, as text. Before #549 a
// buddy's parts held its whole prompt, and its habits were named
// teachingRules: such a stored value reads its voice, and its teachingRules
// as its habits, until a later release rewrites it; its other parts are
// left out, since the global prompt holds them now. A stored value without a
// voice, or without habits under either name, is not a buddy's parts.
import { z } from "zod";
import type { BuddyParts } from "@/buddies/buddy.ts";

const STORED_PARTS = z.union([
  z.object({ voice: z.string(), habits: z.string() }),
  z
    .object({ voice: z.string(), teachingRules: z.string() })
    .transform(({ voice, teachingRules }) => ({
      voice,
      habits: teachingRules,
    })),
]);

export const BUDDY_PARTS: z.ZodType<BuddyParts> = STORED_PARTS.transform(
  ({ voice, habits }): BuddyParts => ({ voice, habits }),
);

// The stored value as a buddy's parts, or undefined when it is not one.
export function parseBuddyParts(stored: unknown): BuddyParts | undefined {
  const parsed = BUDDY_PARTS.safeParse(stored);
  if (!parsed.success) {
    return undefined;
  }
  return parsed.data;
}
