// A built-in buddy's parts: its own voice and habits.
import type { BuddyParts } from "@/buddies/buddy.ts";

// The parts of a buddy with this voice and these habits.
export function buddyParts({ voice, habits }: BuddyParts): BuddyParts {
  return { voice, habits };
}
