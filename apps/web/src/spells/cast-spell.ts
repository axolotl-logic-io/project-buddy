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
} from "@/spells/cast-spell-contract.ts";
import { getSpell } from "@/spells/spell.ts";
import { setSpell } from "@/spells/spell-store.ts";

async function castSpell(
  { spellId }: CastSpellInput,
  { context }: { context: ChatToolContext },
): Promise<CastSpellOutput> {
  if (
    context.questId === undefined ||
    !(await setSpell(context.actingUser, {
      chatId: context.chatId,
      spell: spellId,
    }))
  ) {
    return { status: "needsQuest" };
  }
  return { status: "cast", spellId, name: getSpell(spellId).name };
}
const castSpellTool = tool({
  description: CAST_SPELL_DESCRIPTION,
  inputSchema: CAST_SPELL_INPUT,
  outputSchema: CAST_SPELL_OUTPUT,
  contextSchema: CHAT_TOOL_CONTEXT,
  execute: castSpell,
});

export { castSpellTool };
