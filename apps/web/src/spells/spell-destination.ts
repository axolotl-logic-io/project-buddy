import { z } from "zod";
import { SPELLBOOK_COPY } from "@/ui/copy/spells.ts";

const SPELL_DESTINATION = z.enum(["plan", "brainstorm"]);
type SpellDestination = z.infer<typeof SPELL_DESTINATION>;
const SPELL_DESTINATION_CHOICES = SPELL_DESTINATION.options.map((value) => ({
  value,
  label: SPELLBOOK_COPY.destinations[value],
}));

function spellDestinationLabel(destination: SpellDestination): string {
  return SPELLBOOK_COPY.destinations[destination];
}

export type { SpellDestination };
export { SPELL_DESTINATION, SPELL_DESTINATION_CHOICES, spellDestinationLabel };
