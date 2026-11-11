// What a reset restores: the built-in one's prompt it names, or the starter
// text when there is none.
function resetTarget(source: string | undefined): string {
  if (source === undefined) {
    return "the starter text";
  }
  return `“${source}”`;
}

// The text every prompt's page shares, a construct's, an activity's or a
// spell's.
export const PROMPT_COPY = {
  activityFieldsHeading: "Instructions and opening request",
  spellFieldsHeading: "When to use and instructions",
  nameLabel: "Name",
  sections: "Editor sections",
  sectionError: " — Needs attention",
  constructFieldsHeading: "Instructions",
  namePlaceholderHint:
    "Any {{name}} here is replaced with your name, as set on your account page, or “the user” if you have none.",
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
  // The button that resets an own construct's, activity's or spell's prompt
  // (part), naming the built-in one whose prompt it restores (source), or
  // the starter text when there is none.
  resetLabel: (part: string, source: string | undefined): string =>
    `Reset ${part} to ${resetTarget(source)}`,
  // The dialog that asks before a reset replaces saved text.
  resetTitle: (part: string, source: string | undefined): string =>
    `Reset ${part} to ${resetTarget(source)}?`,
  resetDescription: (part: string, source: string | undefined): string =>
    `This replaces your saved ${part} with ${resetTarget(source)} and discards all unsaved edits on this page. Other saved fields are kept. Your own text can't be brought back. Existing conversations keep their saved instructions.`,
  resetComplete: (part: string, source: string | undefined): string =>
    `Reset complete: ${part} restored to ${resetTarget(source)}.`,
  resetConfirm: (part: string): string => `Reset ${part}`,
  resetCancel: (part: string): string => `Keep my ${part}`,
} as const;
