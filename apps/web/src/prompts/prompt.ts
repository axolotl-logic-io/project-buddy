import { z } from "zod";

const PROMPT_KINDS = ["construct", "spell"] as const;

type PromptKind = (typeof PROMPT_KINDS)[number];

// Historical activities remain stored until a separate cleanup release.
// Runtime definitions still accept only the current prompt kinds.
const STORED_PROMPT_KIND_LIST = ["construct", "activity", "spell"] as const;
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
