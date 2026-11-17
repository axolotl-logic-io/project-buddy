// The constructs and spells open to a user, as the API lists them: the
// built-ins and the user's own spells. Only their functional fields are shown,
// never a construct's private definition.

import { type SpellView, spellView } from "@/api/api-views.ts";
import {
  type Construct,
  getConstruct,
  isConstructId,
  listConstructs,
} from "@/constructs/index.ts";
import type { UserId } from "@/ids.ts";
import { findSpell, listOwnSpells } from "@/spells/own-spell-store.ts";
import { listSpells } from "@/spells/spell.ts";

// A built-in construct assigned by a premade quest.
interface ConstructView {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly builtIn: boolean;
  readonly clonedFrom: string | null;
}

function builtInConstructView(construct: Construct): ConstructView {
  return {
    id: construct.id,
    name: construct.name,
    description: construct.description,
    builtIn: true,
    clonedFrom: null,
  };
}

function listConstructViews(_owner: UserId): Promise<ConstructView[]> {
  return Promise.resolve(listConstructs().map(builtInConstructView));
}

function findConstructView(
  _owner: UserId,
  id: string,
): Promise<ConstructView | undefined> {
  if (isConstructId(id)) {
    return Promise.resolve(builtInConstructView(getConstruct(id)));
  }
  return Promise.resolve(undefined);
}

async function listSpellViews(owner: UserId): Promise<SpellView[]> {
  const own = await listOwnSpells(owner);
  return [...listSpells(), ...own].map(spellView);
}

async function findSpellView(
  owner: UserId,
  id: string,
): Promise<SpellView | undefined> {
  const spell = await findSpell(owner, id);
  if (spell === undefined) {
    return undefined;
  }
  return spellView(spell);
}

export type { ConstructView };
export { findConstructView, findSpellView, listConstructViews, listSpellViews };
