// A prompt is a buddy, an activity or a spell: named text that the site
// puts into the model's instructions, and that the user can customize. The
// kinds share this model; src/buddies/, src/activities/ and src/spells/
// give each its parts.

// The kinds of prompt, as own prompts store them.
const PROMPT_KINDS = ["buddy", "activity", "spell"] as const;

type PromptKind = (typeof PROMPT_KINDS)[number];

// A prompt as a chat keeps it: its name and parts as they were when the
// chat took it, whether it was built in or the user's own.
interface PromptSnapshot<Parts> {
  readonly name: string;
  readonly parts: Parts;
}

export type { PromptKind, PromptSnapshot };
export { PROMPT_KINDS };
