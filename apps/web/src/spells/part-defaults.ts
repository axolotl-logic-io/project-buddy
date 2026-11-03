// What each part of a spell is to its editor: the order the parts are shown
// in, and the text each part resets to.
import { getSpell, isSpellId } from "@/spells/index.ts";
import type { SpellParts } from "@/spells/spell.ts";

type SpellPartKey = keyof SpellParts;

// Every part, in the order the spell page shows them.
const SPELL_PART_KEYS: readonly ["whenToUse", "instructions"] = [
  "whenToUse",
  "instructions",
];

// The parts of a spell that comes from no built-in spell, until the user
// writes their own: safe for the buddy to read, and plain about what is
// missing.
const STARTER_SPELL_PARTS: SpellParts = {
  whenToUse: "Never: this spell has no when-to-use line yet.",
  instructions: "This spell has no instructions yet. Carry on without it.",
};

// The text this part of a spell cloned from clonedFrom resets to: the part
// as the built-in spell it was cloned from has it, or the starter text when
// that is not a built-in spell, such as a spell of the user's own or none.
function defaultSpellPart(
  key: SpellPartKey,
  clonedFrom: string | undefined,
): string {
  if (clonedFrom !== undefined && isSpellId(clonedFrom)) {
    return getSpell(clonedFrom).parts[key];
  }
  return STARTER_SPELL_PARTS[key];
}

export type { SpellPartKey };
export { defaultSpellPart, SPELL_PART_KEYS };
