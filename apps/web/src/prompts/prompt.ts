// Persistence kinds and named definitions shared by stores and snapshots. Constructs, activities and spells have prompts.
import { z } from "zod";

const PROMPT_KINDS = ["construct", "activity", "spell"] as const;

type PromptKind = (typeof PROMPT_KINDS)[number];

// Stored kinds use the domain names without translation.
const STORED_PROMPT_KIND_LIST: typeof PROMPT_KINDS = PROMPT_KINDS;
const STORED_PROMPT_KIND = z.enum(PROMPT_KINDS);

interface NamedDefinition<Definition> {
  readonly name: string;
  readonly definition: Definition;
}

// What resetting an own construct's, activity's or spell's instructions
// restores: the prompt, and the name of the built-in one it comes from, or
// undefined for starter text that is no built-in one's.
interface ResetPrompt {
  readonly source: string | undefined;
  readonly prompt: string;
}

export type { NamedDefinition, PromptKind, ResetPrompt };
export { PROMPT_KINDS, STORED_PROMPT_KIND, STORED_PROMPT_KIND_LIST };
