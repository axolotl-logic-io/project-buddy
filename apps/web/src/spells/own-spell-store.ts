import type { UserId } from "@/ids.ts";
import {
  cloneOwnPrompt,
  createOwnPrompt,
  type DefinitionStore,
  getOwnPrompt,
  listOwnPrompts,
  type OwnPrompt,
  updateOwnPrompt,
} from "@/prompts/own-prompt-store.ts";
import type { NamedDefinition } from "@/prompts/prompt.ts";
import { getSpell, listSpells, SPELL_ID } from "@/spells/spell.ts";
import {
  SPELL_DEFINITION,
  SPELL_NAME_MAX,
  type SpellDefinition,
  type SpellDefinitionInput,
  type SpellSnapshot,
} from "@/spells/spell-definition.ts";

type OwnSpell = OwnPrompt<SpellDefinition>;
const STORE: DefinitionStore<SpellDefinition> = {
  kind: "spell",
  parseDefinition: (stored: unknown): SpellDefinition | undefined =>
    SPELL_DEFINITION.safeParse(stored).data,
  builtIn: (id: string): NamedDefinition<SpellDefinition> | undefined => {
    const parsed = SPELL_ID.safeParse(id);
    if (!parsed.success) {
      return undefined;
    }
    return getSpell(parsed.data);
  },
  limits: {
    nameMax: SPELL_NAME_MAX,
    definitionFits: (definition: SpellDefinition): boolean =>
      SPELL_DEFINITION.safeParse(definition).success,
  },
};

function listOwnSpells(owner: UserId): Promise<OwnSpell[]> {
  return listOwnPrompts(STORE, owner);
}
function getOwnSpell(owner: UserId, id: string): Promise<OwnSpell | undefined> {
  return getOwnPrompt(STORE, owner, id);
}
function createSpell(
  owner: UserId,
  spell: NamedDefinition<SpellDefinitionInput>,
): Promise<OwnSpell> {
  return createOwnPrompt(STORE, owner, {
    name: spell.name,
    definition: SPELL_DEFINITION.parse(spell.definition),
  });
}
function cloneSpell(owner: UserId, id: string): Promise<OwnSpell | undefined> {
  return cloneOwnPrompt(STORE, owner, id);
}
function updateSpell(
  owner: UserId,
  id: string,
  spell: NamedDefinition<SpellDefinitionInput>,
): Promise<OwnSpell | undefined> {
  return updateOwnPrompt(STORE, owner, id, {
    name: spell.name,
    definition: SPELL_DEFINITION.parse(spell.definition),
  });
}
function findSpell(
  owner: UserId,
  id: string,
): Promise<SpellSnapshot | undefined> {
  const parsed = SPELL_ID.safeParse(id);
  if (parsed.success) {
    return Promise.resolve(getSpell(parsed.data));
  }
  return getOwnSpell(owner, id);
}

const NAME_WHITESPACE = /\s+/gu;
function normalizedName(name: string): string {
  return name.trim().replace(NAME_WHITESPACE, " ").toLowerCase();
}
type SpellNameResult =
  | { readonly kind: "found"; readonly spell: SpellSnapshot }
  | { readonly kind: "missing" | "ambiguous" };

async function resolveSpellName(
  owner: UserId,
  name: string,
): Promise<SpellNameResult> {
  const wanted = normalizedName(name);
  const matches = [...listSpells(), ...(await listOwnSpells(owner))].filter(
    (candidate) => normalizedName(candidate.name) === wanted,
  );
  const [spell] = matches;
  if (spell === undefined) {
    return { kind: "missing" };
  }
  if (matches.length > 1) {
    return { kind: "ambiguous" };
  }
  return { kind: "found", spell };
}

export type { OwnSpell };
export {
  cloneSpell,
  createSpell,
  findSpell,
  getOwnSpell,
  listOwnSpells,
  resolveSpellName,
  updateSpell,
};
