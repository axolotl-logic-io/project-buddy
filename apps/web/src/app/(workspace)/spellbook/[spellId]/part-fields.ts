// The spell page's fields: its parts, in the page's order, each with its
// limit, as PromptPartFields shows them.
import type { PromptPartField } from "@/prompts/prompt-part-field.ts";
import { SPELL_PART_KEYS } from "@/spells/part-defaults.ts";
import { SPELL_PART_MAX, type SpellParts } from "@/spells/spell.ts";
import { SPELL_PARTS_COPY } from "@/ui/copy/spells.ts";

// A spell's parts as fields, in the page's order.
export function spellPartFields(parts: SpellParts): PromptPartField[] {
  return SPELL_PART_KEYS.map((key) => ({
    key,
    label: SPELL_PARTS_COPY[key].label,
    help: SPELL_PARTS_COPY[key].help,
    text: parts[key],
    maxLength: SPELL_PART_MAX[key],
  }));
}
