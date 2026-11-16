import { z } from "zod";
import {
  SPELL_DEFINITION,
  type SpellDefinition,
} from "@/spells/spell-definition.ts";

const SPELL_ID = z.enum(["tasks", "brainstorm"]);
type SpellId = z.infer<typeof SPELL_ID>;
interface Spell {
  readonly id: SpellId;
  readonly name: string;
  readonly description: string;
  readonly definition: SpellDefinition;
}
const SPELLS: Readonly<Record<SpellId, Spell>> = {
  tasks: {
    definition: SPELL_DEFINITION.parse({
      destination: "tasks",
    }),
    id: "tasks",
    name: "Tasks",
    description:
      "Save subsequent messages as open tasks until you stop the spell.",
  },
  brainstorm: {
    definition: SPELL_DEFINITION.parse({
      destination: "brainstorm",
    }),
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

export type { SpellId };
export { getSpell, listSpells, SPELL_ID };
