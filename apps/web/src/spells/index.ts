import { blenderManualLookup } from "@/blender-manual/lookup-spell.ts";
import { askOneQuestion } from "@/spells/ask-one-question.ts";
import {
  SPELL_IDS,
  type Spell,
  type SpellId,
  type SpellSnapshot,
} from "@/spells/spell.ts";

const SPELL_ID_SET: ReadonlySet<string> = new Set<string>(SPELL_IDS);

const spellsById: Readonly<Record<SpellId, Spell>> = {
  "ask-one-question": askOneQuestion,
  "blender-manual-lookup": blenderManualLookup,
};

export type {
  Spell,
  SpellDefinition,
  SpellId,
  SpellSnapshot,
} from "@/spells/spell.ts";

export function isSpellId(id: string): id is SpellId {
  return SPELL_ID_SET.has(id);
}

export function listSpells(): Spell[] {
  return SPELL_IDS.map((id) => spellsById[id]);
}

export function getSpell(id: SpellId): Spell {
  return spellsById[id];
}

export function spellSnapshotOf({
  name,
  definition: parts,
}: SpellSnapshot): SpellSnapshot {
  return { name, definition: parts };
}
