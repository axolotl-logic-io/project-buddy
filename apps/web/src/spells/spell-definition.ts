// Selection metadata is separate from the cast prompt. Legacy JSON is decoded and encoded only at storage boundaries.
import { z } from "zod";
import { SPELL_TEXT_MAX, type SpellDefinition } from "@/spells/spell.ts";

export const SPELL_DEFINITION: z.ZodType<SpellDefinition> = z.object({
  whenToUse: z.string(),
  prompt: z.string(),
});

export const SPELL_DEFINITION_EDIT: z.ZodType<SpellDefinition> = z.object({
  whenToUse: z.string().max(SPELL_TEXT_MAX.whenToUse),
  prompt: z.string().max(SPELL_TEXT_MAX.prompt),
});

export function parseSpellDefinition(
  stored: unknown,
): SpellDefinition | undefined {
  const legacy = z
    .object({ whenToUse: z.string(), instructions: z.string() })
    .safeParse(stored);
  if (legacy.success) {
    return {
      whenToUse: legacy.data.whenToUse,
      prompt: legacy.data.instructions,
    };
  }
  const parsed = SPELL_DEFINITION.safeParse(stored);
  if (!parsed.success) {
    return undefined;
  }
  return parsed.data;
}

export function storedSpellPrompt(text: SpellDefinition): unknown {
  return { whenToUse: text.whenToUse, instructions: text.prompt };
}
