// Persistence kinds and named definitions shared by stores and snapshots. Buddies, activities and spells have prompts.
const PROMPT_KINDS = ["buddy", "activity", "spell"] as const;

type PromptKind = (typeof PROMPT_KINDS)[number];

interface NamedDefinition<Definition> {
  readonly name: string;
  readonly definition: Definition;
}

export type { NamedDefinition, PromptKind };
export { PROMPT_KINDS };
