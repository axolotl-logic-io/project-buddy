// These persisted kinds remain in the schema for historical records. Only
// spells have a user-facing definition editor and mutation store.
const STORED_PROMPT_KIND_LIST = ["construct", "activity", "spell"] as const;

interface NamedDefinition<Definition> {
  readonly name: string;
  readonly definition: Definition;
}

export type { NamedDefinition };
export { STORED_PROMPT_KIND_LIST };
