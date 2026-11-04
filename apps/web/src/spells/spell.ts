import type { NamedDefinition } from "@/prompts/prompt.ts";

export const SPELL_IDS = ["ask-one-question", "blender-manual-lookup"] as const;

export type SpellId = (typeof SPELL_IDS)[number];

export const SPELL_NAME_MAX = 80;

export const SPELL_TEXT_MAX: Readonly<Record<keyof SpellDefinition, number>> = {
  whenToUse: 300,
  prompt: 20_000,
};

export interface SpellDefinition {
  readonly whenToUse: string;
  readonly prompt: string;
}

export type SpellSnapshot = NamedDefinition<SpellDefinition>;

export interface Spell extends SpellSnapshot {
  readonly id: SpellId;
}
