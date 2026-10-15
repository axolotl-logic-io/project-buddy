// The schema of a buddy's parts as stored in jsonb, in a chat's snapshot
// or a buddy of the user's own: every part of BuddyParts, as text. A
// stored value that fails it, which only a hand-edited row could hold, is
// not a buddy's parts.
import { z } from "zod";
import type { BuddyParts } from "@/buddies/buddy.ts";

const PART: z.ZodString = z.string();

// Every key of BuddyParts, so a part added there fails to compile here
// until it is checked too.
const BUDDY_PARTS_SHAPE: Readonly<Record<keyof BuddyParts, z.ZodString>> = {
  role: PART,
  citation: PART,
  interview: PART,
  memoryIntro: PART,
  emptyMemory: PART,
  voice: PART,
  sharedRules: PART,
  teachingRules: PART,
  searchManualTool: PART,
  citeManualTool: PART,
  updateMemoryTool: PART,
  openingKickoff: PART,
  neutralKickoff: PART,
  answerNow: PART,
};

export const BUDDY_PARTS: z.ZodType<BuddyParts> = z.object(BUDDY_PARTS_SHAPE);

// The stored value as a buddy's parts, or undefined when it is not one.
export function parseBuddyParts(stored: unknown): BuddyParts | undefined {
  const parsed = BUDDY_PARTS.safeParse(stored);
  if (!parsed.success) {
    return undefined;
  }
  return parsed.data;
}
