import { z } from "zod";

const SPELL_ID = z.enum(["plan", "brainstorm"]);
type SpellId = z.infer<typeof SPELL_ID>;
interface Spell {
  readonly id: SpellId;
  readonly name: string;
  readonly description: string;
}
const SPELLS: Readonly<Record<SpellId, Spell>> = {
  plan: {
    id: "plan",
    name: "Plan",
    description:
      "Save subsequent messages as open Plan steps until you stop the spell.",
  },
  brainstorm: {
    id: "brainstorm",
    name: "Brainstorm",
    description: "Save subsequent messages in Ideas until you stop the spell.",
  },
};
function getSpell(id: SpellId): Spell {
  return SPELLS[id];
}
function listSpells(): Spell[] {
  return SPELL_ID.options.map(getSpell);
}

export type { Spell, SpellId };
export { getSpell, listSpells, SPELL_ID };
