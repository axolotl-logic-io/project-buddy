// A spell is a set of instructions the buddy loads only when it needs them,
// as a skill is in agentic coding. It is a prompt (src/prompts/prompt.ts):
// the site ships built-in spells, and the user can customize them into
// their own. Every chat's instructions list the user's spells by name and
// when-to-use line (spell-choices.ts); the buddy casts one with the
// cast_spell tool, whose result is the spell's instructions. A spell grants
// no tools: its instructions may only say how to use the tools every chat
// has.
import type { PromptSnapshot } from "@/prompts/prompt.ts";

export const SPELL_IDS = ["ask-one-question", "blender-manual-lookup"] as const;

export type SpellId = (typeof SPELL_IDS)[number];

// The longest a spell's name may be.
export const SPELL_NAME_MAX = 80;

// The longest each part of a spell may be. Every chat's instructions carry
// the when-to-use line of every spell the user has, so it is short.
export const SPELL_PART_MAX: Readonly<Record<keyof SpellParts, number>> = {
  whenToUse: 300,
  instructions: 20_000,
};

// A spell's parts, by name, as text.
export interface SpellParts {
  // When the buddy should cast the spell: one line, which every chat's
  // instructions list beside its name.
  readonly whenToUse: string;
  // What the buddy does once it has cast the spell, which the cast's result
  // gives it.
  readonly instructions: string;
}

// A spell as a cast gives it: its name and parts as they are now.
export type SpellSnapshot = PromptSnapshot<SpellParts>;

// A built-in spell.
export interface Spell extends SpellSnapshot {
  readonly id: SpellId;
}
