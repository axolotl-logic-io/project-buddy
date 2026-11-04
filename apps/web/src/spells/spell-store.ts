import type { Transaction } from "@/db/client.ts";
import type { OwnPromptId, UserId } from "@/ids.ts";
import {
  type BoughtPrompt,
  cloneOwnPrompt,
  createOwnPrompt,
  type DefinitionEdit,
  type DefinitionStore,
  deleteOwnPrompt,
  getOwnPrompt,
  listOwnPrompts,
  type OwnPrompt,
  saveBoughtPrompt,
  updateOwnPrompt,
} from "@/prompts/own-prompt-store.ts";
import type { NamedDefinition } from "@/prompts/prompt.ts";
import { getSpell, isSpellId } from "@/spells/index.ts";
import { SPELL_NAME_MAX, type SpellDefinition } from "@/spells/spell.ts";
import {
  parseSpellDefinition,
  SPELL_DEFINITION_EDIT,
  storedSpellPrompt,
} from "@/spells/spell-definition.ts";

type OwnSpell = OwnPrompt<SpellDefinition>;

type SpellEdit = DefinitionEdit<SpellDefinition>;

const SPELL_STORE: DefinitionStore<SpellDefinition> = {
  kind: "spell",
  encodeDefinition: storedSpellPrompt,
  parseDefinition: parseSpellDefinition,
  builtIn: (id: string) => {
    if (!isSpellId(id)) {
      return;
    }
    return getSpell(id);
  },
  limits: {
    nameMax: SPELL_NAME_MAX,
    definitionFits: (parts: SpellDefinition) =>
      SPELL_DEFINITION_EDIT.safeParse(parts).success,
  },
};

export function listOwnSpells(owner: UserId): Promise<OwnSpell[]> {
  return listOwnPrompts(SPELL_STORE, owner);
}

export function getOwnSpell(
  owner: UserId,
  id: string,
): Promise<OwnSpell | undefined> {
  return getOwnPrompt(SPELL_STORE, owner, id);
}

export function createSpell(
  owner: UserId,
  spell: NamedDefinition<SpellDefinition>,
): Promise<OwnSpell> {
  return createOwnPrompt(SPELL_STORE, owner, spell);
}

export function cloneSpell(
  owner: UserId,
  sourceId: string,
): Promise<OwnSpell | undefined> {
  return cloneOwnPrompt(SPELL_STORE, owner, sourceId);
}

export function updateSpell(
  owner: UserId,
  id: string,
  edit: SpellEdit,
): Promise<OwnSpell | undefined> {
  return updateOwnPrompt(SPELL_STORE, owner, id, edit);
}

export function deleteSpell(owner: UserId, id: string): Promise<boolean> {
  return deleteOwnPrompt(SPELL_STORE, owner, id);
}

export function saveBoughtSpell(
  transaction: Transaction,
  owner: UserId,
  bought: BoughtPrompt,
): Promise<OwnPromptId | undefined> {
  return saveBoughtPrompt(SPELL_STORE, transaction, owner, bought);
}

export type { OwnSpell, SpellEdit };
