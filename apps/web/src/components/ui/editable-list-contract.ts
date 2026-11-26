interface EditorOptions {
  readonly label: string;
  readonly save: string;
  readonly cancel: string;
  readonly placeholder: string;
  readonly multiline?: boolean;
  readonly maxLength: number;
  readonly validate: (text: string) => { text: string } | { problem: string };
}

// The split dialog's words, for one kind of list item.
interface SplitCopy {
  readonly title: string;
  readonly description: string;
  // The heading over the item being split.
  readonly original: string;
  // The name of the group of new parts.
  readonly parts: string;
  readonly part: (number: number) => string;
  readonly removePart: (number: number) => string;
  readonly addPart: string;
  // How pasting several lines into a one-line part fills parts.
  readonly pasteHint: string;
  readonly submit: (count: number) => string;
  readonly cancel: string;
  readonly close: string;
  readonly failed: string;
}

// A row's Split action: its menu label, the dialog's words, the most parts
// it takes, and the save that replaces the item with its parts.
interface SplitOptions {
  readonly label: string;
  readonly copy: SplitCopy;
  readonly maxParts: number;
  readonly onSplit: (texts: readonly string[]) => Promise<boolean>;
}

export type { EditorOptions, SplitCopy, SplitOptions };
