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
  title: pageTitle("Spellbook"),
  headerLink: "Spellbook",
  homeLink: "Home",
  heading: "Spellbook",
  intro:
    "A spell is a set of instructions your construct casts when it fits what you need. Every chat lists your spells by name and when to use them; a spell's instructions reach your construct only in the chats that cast it.",
  loading: "Loading spells…",
  builtInHeading: "Built-in spells",
  ownHeading: "Your spells",
  noOwn:
    "No spells of your own yet. Customize one above, or choose New spell to write one from scratch.",
  newSpell: "New spell",
  // The name of a spell written from scratch, until the user renames it.
  newSpellName: "New spell",
  customize: "Customize",
  customizeLabel: (name: string): string => `Customize ${name}`,
  tweak: "Tweak",
  tweakLabel: (name: string): string => `Tweak ${name}`,
  clone: "Clone",
  cloneLabel: (name: string): string => `Clone ${name}`,
  delete: "Delete",
  deleteLabel: (name: string): string => `Delete ${name}`,
  deleteTitle: "Delete this spell?",
  deleteDescription: (name: string): string =>
    `“${name}” will be gone from your Spellbook, and your construct won't cast it again. Chats that already cast it keep what it said.`,
  deleteConfirm: "Delete spell",
  deleteCancel: "Keep it",
} as const;

// The text of a spell's page: its prompt as named parts, editable for a
// spell of the user's own, read-only for a built-in one.
export const SPELL_COPY = {
  title: pageTitle("Spell"),
  spellbookLink: "Spellbook",
  loading: "Loading spell…",
  builtInIntro:
    "A built-in spell can't be changed. Customize it to make a copy of your own, with the fields below, and change that.",
  ownIntro:
    "Your spell’s instructions and when-to-use description. A chat that cast it keeps what it said then, so a change applies to the casts after it.",
} as const;

// Each part of a spell's prompt, by its key, so a part added to SpellDefinition
// fails to compile here until it is named.
export const SPELL_DEFINITION_COPY: Readonly<
  Record<keyof SpellDefinition, FieldCopy>
> = {
  whenToUse: {
    label: "When to use",
    help: "One line that tells your construct when to cast the spell. Every chat's instructions carry it, so keep it short.",
  },
  prompt: {
    label: "Instructions",
    help: "What your construct does once it casts the spell. It reaches your construct only in the chats that cast it.",
  },
};
