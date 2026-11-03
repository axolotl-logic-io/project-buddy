// The buddy's tool for casting a spell: it returns the spell's
// instructions, as they are now, for the buddy to follow. It makes no model
// call and changes nothing, so it needs no quota.
import { tool } from "ai";
import {
  CHAT_TOOL_CONTEXT,
  type ChatToolContext,
} from "@/replies/tools/chat-tool-context.ts";
import {
  CAST_SPELL_DESCRIPTION,
  CAST_SPELL_INPUT,
  CAST_SPELL_OUTPUT,
  type CastSpellInput,
  type CastSpellOutput,
  unknownSpellMessage,
} from "@/spells/cast-spell-contract.ts";
import { chosenSpell } from "@/spells/chosen-spell.ts";

async function castSpell(
  { spellId }: CastSpellInput,
  { context }: { context: ChatToolContext },
): Promise<CastSpellOutput> {
  const spell = await chosenSpell(context.owner, spellId);
  if (spell === undefined) {
    return {
      status: "unknown",
      spellId,
      message: unknownSpellMessage(spellId),
    };
  }
  return {
    status: "cast",
    spellId: spell.id,
    name: spell.name,
    instructions: spell.parts.instructions,
  };
}

const castSpellTool = tool({
  description: CAST_SPELL_DESCRIPTION,
  inputSchema: CAST_SPELL_INPUT,
  outputSchema: CAST_SPELL_OUTPUT,
  contextSchema: CHAT_TOOL_CONTEXT,
  execute: castSpell,
});

export { castSpellTool };
