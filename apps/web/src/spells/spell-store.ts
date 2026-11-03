// The user's own spells, in the own prompt store
// (src/prompts/own-prompt-store.ts), which keeps each its owner's alone.
import type { UserId } from "@/ids.ts";
import {
  cloneOwnPrompt,
  createOwnPrompt,
  deleteOwnPrompt,
  getOwnPrompt,
  listOwnPrompts,
  type OwnPrompt,
  type PromptEdit,
  type PromptKindStore,
  updateOwnPrompt,
} from "@/prompts/own-prompt-store.ts";
import type { PromptSnapshot } from "@/prompts/prompt.ts";
import { getSpell, isSpellId } from "@/spells/index.ts";
import type { SpellParts } from "@/spells/spell.ts";
import { parseSpellParts } from "@/spells/spell-parts-schema.ts";

// A spell of the user's own.
type OwnSpell = OwnPrompt<SpellParts>;

// What an edit changes: the name, the parts, or both.
type SpellEdit = PromptEdit<SpellParts>;

const SPELL_STORE: PromptKindStore<SpellParts> = {
  kind: "spell",
  parseParts: parseSpellParts,
  builtIn: (id: string) => {
    if (!isSpellId(id)) {
      return;
    }
    return getSpell(id);
  },
};

// The owner's spells, oldest first.
export function listOwnSpells(owner: UserId): Promise<OwnSpell[]> {
  return listOwnPrompts(SPELL_STORE, owner);
}

// The owner's spell with this id, or undefined if the id is malformed,
// unknown or another user's.
export function getOwnSpell(
  owner: UserId,
  id: string,
): Promise<OwnSpell | undefined> {
  return getOwnPrompt(SPELL_STORE, owner, id);
}

// A new spell of the owner's, written from scratch with this name and these
// parts.
export function createSpell(
  owner: UserId,
  spell: PromptSnapshot<SpellParts>,
): Promise<OwnSpell> {
  return createOwnPrompt(SPELL_STORE, owner, spell);
}

// A new spell of the owner's, a copy of the spell with the id sourceId,
// named as it is with " (clone)" after: a built-in spell, or one of the
// owner's own. Undefined, saving nothing, if the source is none of those.
export function cloneSpell(
  owner: UserId,
  sourceId: string,
): Promise<OwnSpell | undefined> {
  return cloneOwnPrompt(SPELL_STORE, owner, sourceId);
}

// The owner's spell with this id, edited, or undefined, changing nothing,
// if the id is malformed, unknown or another user's.
export function updateSpell(
  owner: UserId,
  id: string,
  edit: SpellEdit,
): Promise<OwnSpell | undefined> {
  return updateOwnPrompt(SPELL_STORE, owner, id, edit);
}

// Deletes the owner's spell with this id. False, deleting nothing, if the
// id is malformed, unknown or another user's.
export function deleteSpell(owner: UserId, id: string): Promise<boolean> {
  return deleteOwnPrompt(SPELL_STORE, owner, id);
}

export type { OwnSpell, SpellEdit };
