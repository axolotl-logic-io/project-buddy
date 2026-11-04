// What a reset restores: the built-in one's prompt it names, or the starter
// text when there is none.
function resetTarget(source: string | undefined): string {
  if (source === undefined) {
    return "the starter text";
  }
  return `${source}'s`;
}

// The text every prompt's page shares, a buddy's, an activity's or a
// spell's.
export const PROMPT_COPY = {
  boughtResetHint:
    "This copy came from the Marketplace and has no built-in instructions to restore. You can edit and save its instructions.",
  activityFieldsHeading: "Instructions and opening request",
  spellFieldsHeading: "When to use and instructions",
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
  resetLabel: (part: string, source: string | undefined): string =>
    `Reset ${part} to ${resetTarget(source)}`,
  // The dialog that asks before a reset replaces saved text.
  resetTitle: (part: string, source: string | undefined): string =>
    `Reset ${part} to ${resetTarget(source)}?`,
  resetDescription: (part: string, source: string | undefined): string =>
    `Your saved ${part} is replaced with ${resetTarget(source)}, and your own text can't be brought back. Chats that already used it keep what they had.`,
  resetConfirm: (part: string): string => `Reset ${part}`,
  resetCancel: (part: string): string => `Keep my ${part}`,
} as const;
