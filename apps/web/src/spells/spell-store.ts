// The user's own spells, in the own prompt store
// (src/prompts/own-prompt-store.ts), which keeps each its owner's alone and
// within the limits of SPELL_NAME_MAX and SPELL_PART_MAX.
import type { Transaction } from "@/db/client.ts";
import type { OwnPromptId, UserId } from "@/ids.ts";
import {
  type BoughtPrompt,
  cloneOwnPrompt,
  createOwnPrompt,
  deleteOwnPrompt,
  getOwnPrompt,
  listOwnPrompts,
  type OwnPrompt,
  type PromptEdit,
  type PromptKindStore,
  saveBoughtPrompt,
  updateOwnPrompt,
} from "@/prompts/own-prompt-store.ts";
import type { PromptSnapshot } from "@/prompts/prompt.ts";
import { getSpell, isSpellId } from "@/spells/index.ts";
import { SPELL_NAME_MAX, type SpellParts } from "@/spells/spell.ts";
import {
  parseSpellParts,
  SPELL_PARTS_EDIT,
} from "@/spells/spell-parts-schema.ts";

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
  limits: {
    nameMax: SPELL_NAME_MAX,
    partsFit: (parts: SpellParts) => SPELL_PARTS_EDIT.safeParse(parts).success,
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
// parts. A name or part beyond its limit throws, saving nothing.
export function createSpell(
  owner: UserId,
  spell: PromptSnapshot<SpellParts>,
): Promise<OwnSpell> {
  return createOwnPrompt(SPELL_STORE, owner, spell);
}

// A new spell of the owner's, a copy of the spell with the id sourceId,
// named as it is with " (clone)" after, cut short to SPELL_NAME_MAX: a
// built-in spell, or one of the owner's own. Undefined, saving nothing, if the source is none of those.
export function cloneSpell(
  owner: UserId,
  sourceId: string,
): Promise<OwnSpell | undefined> {
  return cloneOwnPrompt(SPELL_STORE, owner, sourceId);
}

// The owner's spell with this id, edited, or undefined, changing nothing,
// if the id is malformed, unknown or another user's. A name or part beyond
// its limit throws, saving nothing.
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

// Saves, in the transaction, the owner's copy of the spell bought from a
// listing, and gives its id; undefined, saving nothing, if it isn't a
// spell's name and parts within the limits.
export function saveBoughtSpell(
  transaction: Transaction,
  owner: UserId,
  bought: BoughtPrompt,
): Promise<OwnPromptId | undefined> {
  return saveBoughtPrompt(SPELL_STORE, transaction, owner, bought);
}

export type { OwnSpell, SpellEdit };
