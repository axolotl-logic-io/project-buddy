// Persistence kinds and named definitions shared by stores and snapshots. Constructs, activities and spells have prompts.
import { z } from "zod";

const PROMPT_KINDS = ["construct", "activity", "spell"] as const;

type PromptKind = (typeof PROMPT_KINDS)[number];

// How each kind is written in stored rows and browsers' saved drafts. A construct keeps its first name, "buddy", so rows
// written now stay readable by the build that is live during a release or
// after a rollback (docs/project-practices.md#site-data).
interface StoredPromptKinds {
  readonly construct: "buddy";
  readonly activity: "activity";
  readonly spell: "spell";
}

const STORED_PROMPT_KINDS: StoredPromptKinds = {
  construct: "buddy",
  activity: "activity",
  spell: "spell",
};

type StoredPromptKind = StoredPromptKinds[PromptKind];

// Every stored kind, for a table's check constraint.
const STORED_PROMPT_KIND_LIST = [
  STORED_PROMPT_KINDS.construct,
  STORED_PROMPT_KINDS.activity,
  STORED_PROMPT_KINDS.spell,
] as const;

// A kind as stored, or as a link or request names it, parsed to its kind;
// anything else fails to parse.
const STORED_PROMPT_KIND = z
  .enum([...PROMPT_KINDS, STORED_PROMPT_KINDS.construct])
  .transform((stored): PromptKind => {
    if (stored === STORED_PROMPT_KINDS.construct) {
      return "construct";
    }
    return stored;
  });

function storedPromptKind(kind: PromptKind): StoredPromptKind {
  return STORED_PROMPT_KINDS[kind];
}

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

export type { NamedDefinition, PromptKind, ResetPrompt, StoredPromptKind };
export {
  PROMPT_KINDS,
  STORED_PROMPT_KIND,
  STORED_PROMPT_KIND_LIST,
  storedPromptKind,
};
