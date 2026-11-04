// The text every prompt's page shares, a buddy's, an activity's or a
// spell's.
export const PROMPT_COPY = {
  nameLabel: "Name",
  promptHeading: "Prompt",
  namePlaceholderHint:
    "Any {{name}} here is replaced with your name, as set on your account page, or “the user” if you have none.",
  limit: (max: number): string =>
    `At most ${max.toLocaleString("en-US")} characters.`,
  save: "Save",
  // The button that resets an own buddy's, activity's or spell's prompt
  // (part), naming the built-in one whose prompt it restores (source), or
  // the starter text when there is none.
  resetLabel: (part: string, source: string | undefined): string => {
    if (source === undefined) {
      return `Reset ${part} to the starter text`;
    }
    return `Reset ${part} to ${source}'s`;
  },
} as const;
