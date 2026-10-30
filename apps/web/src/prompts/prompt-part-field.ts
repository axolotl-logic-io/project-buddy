// One part of a prompt as its page shows it: its key, which names its
// field, its label, what it does, and its text.
interface PromptPartField {
  readonly key: string;
  readonly label: string;
  readonly help: string;
  readonly text: string;
}

export type { PromptPartField };
