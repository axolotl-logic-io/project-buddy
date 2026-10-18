// The schema of a buddy's parts as stored in jsonb, in a chat's snapshot
// or a buddy of the user's own: every part of BuddyParts, as text. A part
// added after parts were first stored may be missing, and reads as the
// default buddy's text. Any other part missing, which only a hand-edited row
// could lack, or a part that is not text, fails it, and a stored value that
// fails it is not a buddy's parts.
import { z } from "zod";
import type { BuddyParts } from "@/buddies/buddy.ts";
import { DEFAULT_BUDDY_ID, getBuddy } from "@/buddies/index.ts";

const PART: z.ZodString = z.string();

// The parts added after parts were first stored, which stored parts may
// lack.
const LATER_PARTS: readonly (keyof BuddyParts)[] = [
  "centralChat",
  "createProjectTool",
  "brainstorming",
  "projectBreakdown",
];

// Every key of BuddyParts, so a part added there fails to compile here
// until it is checked too.
const STORED_PARTS_SHAPE: Readonly<
  Record<keyof BuddyParts, z.ZodType<string>>
> = {
  role: PART,
  citation: PART,
  interview: PART,
  brainstorming: PART,
  projectBreakdown: PART,
  centralChat: PART,
  memoryIntro: PART,
  emptyMemory: PART,
  voice: PART,
  sharedRules: PART,
  teachingRules: PART,
  searchManualTool: PART,
  citeManualTool: PART,
  updateMemoryTool: PART,
  createProjectTool: PART,
  openingKickoff: PART,
  neutralKickoff: PART,
  answerNow: PART,
};

// The stored shape, with each later part defaulting to the default buddy's
// text.
function buddyPartsShape(): Readonly<
  Record<keyof BuddyParts, z.ZodType<string>>
> {
  const shape: Record<keyof BuddyParts, z.ZodType<string>> = {
    ...STORED_PARTS_SHAPE,
  };
  const defaults = getBuddy(DEFAULT_BUDDY_ID).parts;
  for (const key of LATER_PARTS) {
    shape[key] = PART.default(defaults[key]);
  }
  return shape;
}

export const BUDDY_PARTS: z.ZodType<BuddyParts> = z.object(buddyPartsShape());

// The stored value as a buddy's parts, or undefined when it is not one.
export function parseBuddyParts(stored: unknown): BuddyParts | undefined {
  const parsed = BUDDY_PARTS.safeParse(stored);
  if (!parsed.success) {
    return undefined;
  }
  return parsed.data;
}
