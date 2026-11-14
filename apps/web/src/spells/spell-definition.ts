import { z } from "zod";
import { OWN_PROMPT_ID } from "@/ids.ts";
import { SPELL_DESTINATION } from "@/spells/spell-destination.ts";

const SPELL_NAME_MAX = 120;
const SPELL_REPLY_MAX = 2000;
const SPELL_REPLY_CHOICES_MAX = 20;
const SPELL_RESPONSE_KEYS = [
  "castReply",
  "savedReply",
  "stopReply",
  "invalidReply",
] as const;
type SpellResponseKey = (typeof SPELL_RESPONSE_KEYS)[number];
const DEFAULT_SPELL_RESPONSES = {
  castReply:
    "Cast {{spell}}. Subsequent messages go into {{bucket}}. Use stop when you’re finished.",
  savedReply: "Saved to {{bucket}}.",
  stopReply: "Spell stopped. Back to Chat.",
  invalidReply: "Use 1 to 200 characters for each idea or Plan step.",
};
const SPELL_REPLY = z.string().trim().min(1).max(SPELL_REPLY_MAX);
const SPELL_REPLIES = z
  .union([
    SPELL_REPLY,
    z.array(SPELL_REPLY).min(1).max(SPELL_REPLY_CHOICES_MAX),
  ])
  .transform((value): string[] => {
    if (typeof value === "string") {
      return [value];
    }
    return value;
  });
const SPELL_REFERENCE = z.union([SPELL_DESTINATION, OWN_PROMPT_ID]);
const SPELL_DEFINITION = z.object({
  destination: SPELL_DESTINATION,
  castReply: SPELL_REPLIES.default([DEFAULT_SPELL_RESPONSES.castReply]),
  savedReply: SPELL_REPLIES.default([DEFAULT_SPELL_RESPONSES.savedReply]),
  stopReply: SPELL_REPLIES.default([DEFAULT_SPELL_RESPONSES.stopReply]),
  invalidReply: SPELL_REPLIES.default([DEFAULT_SPELL_RESPONSES.invalidReply]),
});
const SPELL_SNAPSHOT = z.object({
  id: SPELL_REFERENCE,
  name: z.string().trim().min(1).max(SPELL_NAME_MAX),
  definition: SPELL_DEFINITION,
});
type SpellDefinitionInput = z.input<typeof SPELL_DEFINITION>;
type SpellDefinition = z.infer<typeof SPELL_DEFINITION>;
type SpellReference = z.infer<typeof SPELL_REFERENCE>;
type SpellSnapshot = z.infer<typeof SPELL_SNAPSHOT>;

export type {
  SpellDefinition,
  SpellDefinitionInput,
  SpellReference,
  SpellResponseKey,
  SpellSnapshot,
};
export {
  DEFAULT_SPELL_RESPONSES,
  SPELL_DEFINITION,
  SPELL_NAME_MAX,
  SPELL_REFERENCE,
  SPELL_REPLIES,
  SPELL_REPLY_CHOICES_MAX,
  SPELL_REPLY_MAX,
  SPELL_RESPONSE_KEYS,
  SPELL_SNAPSHOT,
};
