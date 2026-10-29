// What each part of a buddy is to its editor: the order the parts are
// shown in, and the text each part resets to.

import type { BuddyParts } from "@/buddies/buddy.ts";
import { DEFAULT_BUDDY_ID, getBuddy, isBuddyId } from "@/buddies/index.ts";

type BuddyPartKey = keyof BuddyParts;

// Every part, in the order the buddy page shows them.
const BUDDY_PART_KEYS: readonly ["voice", "habits"] = ["voice", "habits"];

const PART_KEY_SET: ReadonlySet<string> = new Set<string>(BUDDY_PART_KEYS);

function isBuddyPartKey(key: string): key is BuddyPartKey {
  return PART_KEY_SET.has(key);
}

// The text this part of a buddy cloned from clonedFrom resets to: the
// part as the built-in buddy it was cloned from has it, or as Hippy has it
// when that is not a built-in buddy, such as a buddy of the user's own.
function defaultPart(
  key: BuddyPartKey,
  clonedFrom: string | undefined,
): string {
  if (clonedFrom !== undefined && isBuddyId(clonedFrom)) {
    return getBuddy(clonedFrom).parts[key];
  }
  return getBuddy(DEFAULT_BUDDY_ID).parts[key];
}

export type { BuddyPartKey };
export { BUDDY_PART_KEYS, defaultPart, isBuddyPartKey };
