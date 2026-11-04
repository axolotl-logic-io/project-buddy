import type { UserId } from "@/ids.ts";
import { listSpells } from "@/spells/index.ts";
import type { SpellChoice } from "@/spells/spell-choice.ts";
import { listOwnSpells } from "@/spells/spell-store.ts";

async function spellChoices(owner: UserId): Promise<SpellChoice[]> {
  const own = await listOwnSpells(owner);
  return [...listSpells(), ...own].map(({ id, name, definition: parts }) => ({
    id,
    name,
    whenToUse: parts.whenToUse,
  }));
}

export { spellChoices };
