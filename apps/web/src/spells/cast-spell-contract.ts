import { z } from "zod";
import { SPELL_ID } from "@/spells/spell.ts";

const CAST_SPELL_TOOL = "cast_spell";
const CAST_SPELL_DESCRIPTION =
  "Cast Plan or Brainstorm to route subsequent messages into Plan or Ideas until stopped.";
const CAST_SPELL_INPUT = z.object({ spellId: SPELL_ID });
const CAST_SPELL_OUTPUT = z.discriminatedUnion("status", [
  z.object({ status: z.literal("cast"), spellId: SPELL_ID, name: z.string() }),
  z.object({ status: z.literal("needsQuest") }),
]);
type CastSpellInput = z.infer<typeof CAST_SPELL_INPUT>;
type CastSpellOutput = z.infer<typeof CAST_SPELL_OUTPUT>;

export type { CastSpellInput, CastSpellOutput };
export {
  CAST_SPELL_DESCRIPTION,
  CAST_SPELL_INPUT,
  CAST_SPELL_OUTPUT,
  CAST_SPELL_TOOL,
};
