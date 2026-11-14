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
import { resolveSpellName } from "@/spells/own-spell-store.ts";
import { setSpell } from "@/spells/spell-store.ts";

async function castSpell(
  { name }: CastSpellInput,
  { context }: { context: ChatToolContext },
): Promise<CastSpellOutput> {
  if (context.questId === undefined) {
    return { status: "needsQuest" };
  }
  const resolved = await resolveSpellName(context.actingUser, name);
  if (resolved.kind !== "found") {
    return { status: "unavailable" };
  }
  const { spell } = resolved;
  if (
    !(await setSpell(context.actingUser, {
      chatId: context.chatId,
      spell: spell.id,
    }))
  ) {
    return { status: "unavailable" };
  }
  return { status: "cast", spellId: spell.id, name: spell.name };
}

const castSpellTool = tool({
  description: CAST_SPELL_DESCRIPTION,
  inputSchema: CAST_SPELL_INPUT,
  outputSchema: CAST_SPELL_OUTPUT,
  contextSchema: CHAT_TOOL_CONTEXT,
  execute: castSpell,
});

export { castSpellTool };
