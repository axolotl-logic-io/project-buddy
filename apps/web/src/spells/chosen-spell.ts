import type { OwnPromptId, UserId } from "@/ids.ts";
import { getSpell, isSpellId, spellSnapshotOf } from "@/spells/index.ts";
import type { SpellId, SpellSnapshot } from "@/spells/spell.ts";
import { getOwnSpell } from "@/spells/spell-store.ts";

interface CastableSpell extends SpellSnapshot {
  readonly id: SpellId | OwnPromptId;
}

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
  return { id: own.id, name: own.name, definition: own.definition };
}

export type { CastableSpell };
export { chosenSpell };
