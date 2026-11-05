// What the cast_spell tool takes and returns, shared by the tool and the
// part that shows the cast in the chat. It imports nothing from the server,
// because the part in the browser imports it too.
import { getToolName, isToolUIPart, type UIMessage } from "ai";
import { z } from "zod";

const CAST_SPELL_TOOL = "cast_spell";

// The tool's description.
const CAST_SPELL_DESCRIPTION = [
  "Cast one of the spells in your instructions, by its id, to load its instructions.",
  "Call it when a spell's when-to-use line fits what the user needs now, before you act on it, and not again for a spell already cast in this chat: its instructions are in the result above.",
  "The result gives the spell's instructions: follow them, in this reply and after. A spell gives you no new tools. The chat shows the user the cast.",
].join(" ");

const CAST_SPELL_INPUT = z.object({
  spellId: z
    .string()
    .describe("The spell's id, exactly as your list of spells gives it."),
});

// The spell cast, with its name and instructions as they were at the cast,
// which the saved reply keeps, so the construct reads them in later replies and
// editing the spell changes no past chat; or why no spell was cast: the id
// is not one of the user's spells. People read the saved reply without the
// instructions (withoutSpellInstructions).
const CAST_SPELL_OUTPUT = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("cast"),
    spellId: z.string(),
    name: z.string(),
    instructions: z.string().optional(),
  }),
  z.object({
    status: z.literal("unknown"),
    spellId: z.string(),
    message: z.string(),
  }),
]);

type CastSpellInput = z.infer<typeof CAST_SPELL_INPUT>;
type CastSpellOutput = z.infer<typeof CAST_SPELL_OUTPUT>;

// What a cast of an id that is not one of the user's spells tells the
// model.
function unknownSpellMessage(spellId: string): string {
  return `No spell has the id "${spellId}". Cast only the spells your instructions list, by the id they give, or carry on without one.`;
}

// The message without the instructions of any spell cast_spell cast in it,
// as people read it (listMessages in src/chats/store.ts), so they reach no
// one but the model, whoever else the chat is open to. Every other part is left as it
// is.
function withoutSpellInstructions<Message extends UIMessage>(
  message: Message,
): Message {
  return {
    ...message,
    parts: message.parts.map((part) => {
      if (
        !isToolUIPart(part) ||
        getToolName(part) !== CAST_SPELL_TOOL ||
        part.state !== "output-available"
      ) {
        return part;
      }
      const output = CAST_SPELL_OUTPUT.safeParse(part.output);
      if (!output.success || output.data.status !== "cast") {
        return part;
      }
      const { instructions: _instructions, ...kept } = output.data;
      return { ...part, output: kept };
    }),
  };
}

export type { CastSpellInput, CastSpellOutput };
export {
  CAST_SPELL_DESCRIPTION,
  CAST_SPELL_INPUT,
  CAST_SPELL_OUTPUT,
  CAST_SPELL_TOOL,
  unknownSpellMessage,
  withoutSpellInstructions,
};
