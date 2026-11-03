// A spell as the buddy casts it, by id: a built-in spell, or one of the
// user's own.
import type { OwnPromptId, UserId } from "@/ids.ts";
import { getSpell, isSpellId, spellSnapshotOf } from "@/spells/index.ts";
import type { SpellId, SpellSnapshot } from "@/spells/spell.ts";
import { getOwnSpell } from "@/spells/spell-store.ts";

// A spell the buddy can cast: its id, a built-in spell's or an own spell's,
// and its snapshot as it is now.
interface CastableSpell extends SpellSnapshot {
  readonly id: SpellId | OwnPromptId;
}

// The owner's spell with this id, built in or their own, as it is now;
// undefined if the id is neither, such as another user's spell.
async function chosenSpell(
  owner: UserId,
  spellId: string,
): Promise<CastableSpell | undefined> {
  if (isSpellId(spellId)) {
    return { id: spellId, ...spellSnapshotOf(getSpell(spellId)) };
  }
  const own = await getOwnSpell(owner, spellId);
  if (own === undefined) {
    return undefined;
  }
  return { id: own.id, name: own.name, parts: own.parts };
}

export type { CastableSpell };
export { chosenSpell };
