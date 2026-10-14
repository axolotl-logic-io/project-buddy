// What each part of a buddy is to its editor: the order the parts are
// shown in, which are mechanics that the app depends on, and the text each
// part resets to.

import type { BuddyParts } from "@/buddies/buddy.ts";
import { DEFAULT_BUDDY_ID, getBuddy, isBuddyId } from "@/buddies/index.ts";

type BuddyPartKey = keyof BuddyParts;

// Every part, in the order the buddy page shows them: the buddy's own
// voice and teaching rules first, then the parts every buddy starts with,
// in the prompt's order.
const BUDDY_PART_KEYS: readonly BuddyPartKey[] = [
  "voice",
  "teachingRules",
  "role",
  "sharedRules",
  "citation",
  "interview",
  "memoryIntro",
  "emptyMemory",
  "searchManualTool",
  "citeManualTool",
  "updateMemoryTool",
  "openingKickoff",
  "neutralKickoff",
  "answerNow",
];

// The parts that citations, the memory, search or the mock tutor rely on, so
// that an edit can break them.
const MECHANICS_PARTS: ReadonlySet<BuddyPartKey> = new Set<BuddyPartKey>([
  "citation",
  "interview",
  "memoryIntro",
  "emptyMemory",
  "searchManualTool",
  "citeManualTool",
  "updateMemoryTool",
  "openingKickoff",
  "neutralKickoff",
  "answerNow",
  "sharedRules",
]);

// The parts the tutor's system prompt reads (src/tutor/system-prompt.ts),
// where every {{name}} becomes the user's name. The tools, the kickoffs and
// answer-now are sent as written.
const SYSTEM_PROMPT_PARTS: ReadonlySet<BuddyPartKey> = new Set<BuddyPartKey>([
  "role",
  "citation",
  "interview",
  "memoryIntro",
  "emptyMemory",
  "voice",
  "sharedRules",
  "teachingRules",
]);

const PART_KEY_SET: ReadonlySet<string> = new Set<string>(BUDDY_PART_KEYS);

function isBuddyPartKey(key: string): key is BuddyPartKey {
  return PART_KEY_SET.has(key);
}

// Whether an edit to this part can break citations, the memory or search.
function isMechanicsPart(key: BuddyPartKey): boolean {
  return MECHANICS_PARTS.has(key);
}

// The text this part of a buddy cloned from clonedFrom resets to: the
// part as the built-in buddy it was cloned from has it, or as Hippy has it
// when that is not a built-in buddy, such as a buddy of the user's own.
// Only the voice and teaching rules differ between built-in buddies; every
// other part is the default every buddy starts with.
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
export {
  BUDDY_PART_KEYS,
  defaultPart,
  isBuddyPartKey,
  isMechanicsPart,
  SYSTEM_PROMPT_PARTS,
};
