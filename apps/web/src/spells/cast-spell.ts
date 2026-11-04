import { tool } from "ai";
import { withUserName } from "@/accounts/user-name.ts";
import { readUserName } from "@/accounts/users-store.ts";
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
  const [spell, userName] = await Promise.all([
    chosenSpell(context.actingUser, spellId),
    readUserName(context.actingUser),
  ]);
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
    instructions: withUserName(spell.definition.prompt, userName),
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
