interface EditorOptions {
  readonly label: string;
  readonly save: string;
  readonly cancel: string;
  readonly placeholder: string;
  readonly maxLength: number;
  readonly validate: (text: string) => { text: string } | { problem: string };
}

export type { EditorOptions };
