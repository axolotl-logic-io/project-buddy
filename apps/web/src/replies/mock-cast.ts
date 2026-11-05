// "/mock-cast <spell id>" makes the mock construct cast the spell, then reply
// with the instructions the cast gave it, or with why it cast none, so
// server tests can check what casting a spell gives the construct.
import type { MockConversation, MockStep } from "@/replies/mock-script.ts";
import {
  CAST_SPELL_OUTPUT,
  CAST_SPELL_TOOL,
} from "@/spells/cast-spell-contract.ts";

// The reply after the cast: the spell's name and instructions, or the
// cast's message when it cast none.
function textAfterCast(output: unknown): string {
  const cast = CAST_SPELL_OUTPUT.safeParse(output);
  if (!cast.success) {
    return "The mock construct could not cast the spell.";
  }
  if (cast.data.status === "unknown") {
    return `The mock construct cast no spell: ${cast.data.message}`;
  }
  return [
    `The mock construct cast ${cast.data.name}:`,
    "",
    cast.data.instructions ?? "",
  ].join("\n");
}

function mockCastReply(
  spellId: string,
  { toolResults }: MockConversation,
): MockStep[] {
  const cast: MockStep = {
    text: "",
    toolCalls: [{ toolName: CAST_SPELL_TOOL, input: { spellId } }],
  };
  const [result] = toolResults;
  if (result === undefined) {
    return [cast];
  }
  return [cast, { text: textAfterCast(result.output), toolCalls: [] }];
}

export { mockCastReply };
