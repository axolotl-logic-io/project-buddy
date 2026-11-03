// The text every prompt's page shares, a buddy's, an activity's or a
// spell's.
export const PROMPT_COPY = {
  nameLabel: "Name",
  partsHeading: "Prompt parts",
  namePlaceholderHint:
    "Any {{name}} here is replaced with your name, as set on your account page, or “the user” if you have none.",
  limit: (max: number): string =>
    `At most ${max.toLocaleString("en-US")} characters.`,
  save: "Save",
  reset: "Reset to default",
  resetLabel: (part: string): string => `Reset ${part} to default`,
} as const;
