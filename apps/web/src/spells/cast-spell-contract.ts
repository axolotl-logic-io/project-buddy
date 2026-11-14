import { z } from "zod";
import { SPELL_NAME_MAX, SPELL_REFERENCE } from "@/spells/spell-definition.ts";

const CAST_SPELL_TOOL = "cast_spell";
const CAST_SPELL_DESCRIPTION =
  "Cast an available spell by its name to route subsequent messages into its Plan or Ideas destination until stopped.";
const CAST_SPELL_INPUT = z.object({
  name: z.string().trim().min(1).max(SPELL_NAME_MAX),
});
const CAST_SPELL_OUTPUT = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("cast"),
    spellId: SPELL_REFERENCE,
    name: z.string(),
  }),
  z.object({ status: z.literal("needsQuest") }),
  z.object({ status: z.literal("unavailable") }),
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
