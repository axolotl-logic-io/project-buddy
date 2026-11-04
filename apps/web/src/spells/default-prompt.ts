import type { ResetPrompt } from "@/prompts/prompt.ts";
import { getSpell, isSpellId } from "@/spells/index.ts";
import type { SpellDefinition } from "@/spells/spell.ts";

// What resetting a spell cloned from source restores: the built-in spell's
// instructions it was customized from, or else starter instructions.
export function spellResetPrompt(source: string | undefined): ResetPrompt {
  if (source !== undefined && isSpellId(source)) {
    const spell = getSpell(source);
    return { source: spell.name, prompt: spell.definition.prompt };
  }
  return {
    source: undefined,
    prompt: "This spell has no instructions yet. Carry on without it.",
  };
}
export function starterSpellDefinition(): SpellDefinition {
  return {
    whenToUse: "Never: this spell has no when-to-use line yet.",
    prompt: spellResetPrompt(undefined).prompt,
  };
}
