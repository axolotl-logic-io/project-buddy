// Persistence kinds and named definitions shared by stores and snapshots. Buddies, activities and spells have prompts.
const PROMPT_KINDS = ["buddy", "activity", "spell"] as const;

type PromptKind = (typeof PROMPT_KINDS)[number];

interface NamedDefinition<Definition> {
  readonly name: string;
  readonly definition: Definition;
}

// What resetting an own buddy's, activity's or spell's prompt restores: the
// prompt, and the name of the built-in one it comes from, or undefined for
// starter text that is no built-in one's.
interface ResetPrompt {
  readonly source: string | undefined;
  readonly prompt: string;
}

export type { NamedDefinition, PromptKind, ResetPrompt };
export { PROMPT_KINDS };
