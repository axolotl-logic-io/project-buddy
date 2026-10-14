// The schema of a persona's parts as stored in jsonb, in a chat's snapshot
// or a persona of the user's own: every part of PersonaParts, as text. A
// stored value that fails it, which only a hand-edited row could hold, is
// not a persona's parts.
import { z } from "zod";
import type { PersonaParts } from "@/personas/persona.ts";

const PART: z.ZodString = z.string();

// Every key of PersonaParts, so a part added there fails to compile here
// until it is checked too.
const PERSONA_PARTS_SHAPE: Readonly<Record<keyof PersonaParts, z.ZodString>> = {
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

export const PERSONA_PARTS: z.ZodType<PersonaParts> =
  z.object(PERSONA_PARTS_SHAPE);

// The stored value as a persona's parts, or undefined when it is not one.
export function parsePersonaParts(stored: unknown): PersonaParts | undefined {
  const parsed = PERSONA_PARTS.safeParse(stored);
  if (!parsed.success) {
    return undefined;
  }
  return parsed.data;
}
