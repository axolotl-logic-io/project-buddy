export const PROMPT_COPY = {
  nameLabel: "Name",
  sections: "Editor sections",
  sectionError: " — Needs attention",
  namePlaceholderHint:
    "Any {{name}} here is replaced with your name, as set on Settings, or “the user” if you have none.",
  limit: (max: number): string =>
    `At most ${max.toLocaleString("en-US")} characters.`,
  textHint: (help: string, max: number | undefined): string => {
    const hints = [help, PROMPT_COPY.namePlaceholderHint];
    if (max !== undefined) {
      hints.push(PROMPT_COPY.limit(max));
    }
    return hints.join(" ");
  },
  needsName: (kind: string): string => `Give the ${kind} a name.`,
  resetPrompt: "Reset prompt to default",
  resetDone: "The prompt is back to its default. Save to keep it.",
  undoReset: "Undo reset",
  restored: "Your unsaved changes from before are back. Save to keep them.",
  discard: "Cancel",
  save: "Save",
  saved: "Saved.",
} as const;
