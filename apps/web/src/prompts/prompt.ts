import { z } from "zod";

const PROMPT_KINDS = ["construct"] as const;

type PromptKind = (typeof PROMPT_KINDS)[number];

// Stored kinds use the domain names without translation.
const STORED_PROMPT_KIND_LIST: typeof PROMPT_KINDS = PROMPT_KINDS;
const STORED_PROMPT_KIND = z.enum(PROMPT_KINDS);

interface NamedDefinition<Definition> {
  readonly name: string;
  readonly definition: Definition;
}

interface ResetPrompt {
  readonly source: string | undefined;
  readonly prompt: string;
}

export type { NamedDefinition, PromptKind, ResetPrompt };
export { PROMPT_KINDS, STORED_PROMPT_KIND, STORED_PROMPT_KIND_LIST };
