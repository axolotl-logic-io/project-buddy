// The schemas of a spell's parts: as stored in jsonb, in a spell of the
// user's own, and as a form saves them, within the limits of SPELL_PART_MAX.
// A stored value that fails the first is not a spell's parts.
import { z } from "zod";
import { SPELL_PART_MAX, type SpellParts } from "@/spells/spell.ts";

export const SPELL_PARTS: z.ZodType<SpellParts> = z.object({
  whenToUse: z.string(),
  instructions: z.string(),
});

// A spell's parts as an edit saves them: each within its limit.
export const SPELL_PARTS_EDIT: z.ZodType<SpellParts> = z.object({
  whenToUse: z.string().max(SPELL_PART_MAX.whenToUse),
  instructions: z.string().max(SPELL_PART_MAX.instructions),
});

// The stored value as a spell's parts, or undefined when it is not one.
export function parseSpellParts(stored: unknown): SpellParts | undefined {
  const parsed = SPELL_PARTS.safeParse(stored);
  if (!parsed.success) {
    return undefined;
  }
  return parsed.data;
}
