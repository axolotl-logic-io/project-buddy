// The text of the Spellbook pages: the built-in spells and the user's own,
// each with its actions, and a spell's page.
import type { SpellDefinition } from "@/spells/spell.ts";
import { pageTitle } from "@/ui/copy/site.ts";

// A part of a spell's prompt as its page names it: its label, and what it
// does.
interface FieldCopy {
  readonly label: string;
  readonly help: string;
}

export const SPELLBOOK_COPY = {
  builtInHeading: "Built-in spells",
  ownHeading: "Your spells",
  noOwn:
    "No spells of your own yet. Make a copy of a built-in one, or choose Create spell to make one without copying another.",
  newSpell: "Create spell",
  // The name of a crafted spell, until the user renames it.
  newSpellName: "New spell",
  customize: "Make a copy",
  customizeLabel: (name: string): string => `Make a copy of ${name}`,
  tweak: "Edit",
  tweakLabel: (name: string): string => `Edit your ${name}`,
  clone: "Make a copy",
  cloneLabel: (name: string): string => `Make a copy of ${name}`,
} as const;

// The text of a spell's page: its prompt as named parts, editable for a
// spell of the user's own, read-only for a built-in one.
export const SPELL_COPY = {
  title: pageTitle("Spell"),
  spellbookLink: "Spellbook",
  loading: "Loading spell…",
  builtInIntro:
    "A built-in spell can't be changed. Choose Make a copy to edit your own version.",
  ownIntro:
    "Your spell’s instructions and when-to-use description. A conversation that cast it keeps what it said then, so a change applies to the casts after it.",
} as const;

// Each part of a spell's prompt, by its key, so a part added to SpellDefinition
// fails to compile here until it is named.
export const SPELL_DEFINITION_COPY: Readonly<
  Record<keyof SpellDefinition, FieldCopy>
> = {
  whenToUse: {
    label: "When to use",
    help: "One line that tells your construct when to cast the spell. Every conversation's instructions carry it, so keep it short.",
  },
  prompt: {
    label: "Instructions",
    help: "The name identifies the spell; the Spell Sheet contains its instructions. These reach your construct only in conversations that cast it.",
  },
};
