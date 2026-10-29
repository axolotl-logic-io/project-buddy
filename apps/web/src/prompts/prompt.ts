// A prompt is a buddy or an activity: named text that the site puts into
// the model's instructions, and that the user can customize. Both kinds
// share this model; src/buddies/ and src/activities/ give each its parts.

// The kinds of prompt, as own prompts store them.
const PROMPT_KINDS = ["buddy", "activity"] as const;

type PromptKind = (typeof PROMPT_KINDS)[number];

// A prompt as a chat keeps it: its name and parts as they were when the
// chat took it, whether it was built in or the user's own.
interface PromptSnapshot<Parts> {
  readonly name: string;
  readonly parts: Parts;
}

export type { PromptKind, PromptSnapshot };
export { PROMPT_KINDS };
