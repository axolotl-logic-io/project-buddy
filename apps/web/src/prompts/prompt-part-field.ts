// One part of a prompt as its page shows it: its key, which names its
// field, its label, what it does, its text, and the most characters it may
// hold, if its kind limits it.
interface PromptPartField {
  readonly key: string;
  readonly label: string;
  readonly help: string;
  readonly text: string;
  readonly maxLength?: number;
}

export type { PromptPartField };
