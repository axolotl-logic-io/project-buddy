// The constructs and spells open to a user, as the API lists them: the
// built-ins, then the user's own. Only their functional fields are shown,
// never a construct's private definition.

import { type SpellView, spellView } from "@/api/api-views.ts";
import {
  getOwnConstruct,
  listConstructs as listOwnConstructs,
  type OwnConstruct,
} from "@/constructs/construct-store.ts";
import {
  type Construct,
  getConstruct,
  isConstructId,
  listConstructs,
} from "@/constructs/index.ts";
import type { UserId } from "@/ids.ts";
import { findSpell, listOwnSpells } from "@/spells/own-spell-store.ts";
import { listSpells } from "@/spells/spell.ts";

// A construct: a built-in, or the user's own, which may be a copy of
// another.
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

function ownConstructView(construct: OwnConstruct): ConstructView {
  return {
    id: construct.id,
    name: construct.name,
    description: null,
    builtIn: false,
    clonedFrom: construct.clonedFrom ?? null,
  };
}

async function listConstructViews(owner: UserId): Promise<ConstructView[]> {
  const own = await listOwnConstructs(owner);
  return [
    ...listConstructs().map(builtInConstructView),
    ...own.map(ownConstructView),
  ];
}

async function findConstructView(
  owner: UserId,
  id: string,
): Promise<ConstructView | undefined> {
  if (isConstructId(id)) {
    return builtInConstructView(getConstruct(id));
  }
  const own = await getOwnConstruct(owner, id);
  if (own === undefined) {
    return undefined;
  }
  return ownConstructView(own);
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
