export const PROMPT_COPY = {
  nameLabel: "Name",
  sections: "Editor sections",
  sectionError: " — Needs attention",
  namePlaceholderHint:
    "Any {{name}} here is replaced with your name, as set on Settings, or “the user” if you have none.",
  limit: (max: number): string =>
    `At most ${max.toLocaleString("en-US")} characters.`,
  needsName: (kind: string): string => `Give the ${kind} a name.`,
  restored: "Your unsaved changes from before are back. Save to keep them.",
  discard: "Cancel",
  save: "Save",
  saved: "Saved.",
} as const;
