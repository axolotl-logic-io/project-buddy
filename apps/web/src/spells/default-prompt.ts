import { getSpell, isSpellId } from "@/spells/index.ts";
import type { SpellDefinition } from "@/spells/spell.ts";
export function defaultSpellPrompt(source: string | undefined): string {
  if (source !== undefined && isSpellId(source)) {
    return getSpell(source).definition.prompt;
  }
  return "This spell has no instructions yet. Carry on without it.";
}
export function starterSpellDefinition(): SpellDefinition {
  return {
    whenToUse: "Never: this spell has no when-to-use line yet.",
    prompt: defaultSpellPrompt(undefined),
  };
}
