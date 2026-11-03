// The spells a user's buddy can cast, built in and their own
// (spell-choice.ts).
import type { UserId } from "@/ids.ts";
import { listSpells } from "@/spells/index.ts";
import type { SpellChoice } from "@/spells/spell-choice.ts";
import { listOwnSpells } from "@/spells/spell-store.ts";

// The owner's spells: the built-in ones, then their own, oldest first.
async function spellChoices(owner: UserId): Promise<SpellChoice[]> {
  const own = await listOwnSpells(owner);
  return [...listSpells(), ...own].map(({ id, name, parts }) => ({
    id,
    name,
    whenToUse: parts.whenToUse,
  }));
}

export { spellChoices };
