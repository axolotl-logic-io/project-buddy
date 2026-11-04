const BOUGHT_DELETION =
  " This copy came from a Marketplace listing. Deleting it gives no refund. You can clone any copy you still have for free. If you have no other copy, getting it again costs the listing’s current price, if it is still listed; its instructions may have changed.";
const LISTED_DELETION =
  " Published listings stay available until you unlist them from the Marketplace.";

// What a reset restores: the built-in one's prompt it names, or the starter
// text when there is none.
function resetTarget(source: string | undefined): string {
  if (source === undefined) {
    return "the starter text";
  }
  return `“${source}”`;
}

// The text every prompt's page shares, a buddy's, an activity's or a
// spell's.
export const PROMPT_COPY = {
  boughtResetHint:
    "This copy came from the Marketplace and has no built-in instructions to restore. Clone it before editing to keep a copy of its current instructions.",
  activityFieldsHeading: "Instructions and opening request",
  spellFieldsHeading: "When to use and instructions",
  nameLabel: "Name",
  promptHeading: "Prompt",
  namePlaceholderHint:
    "Any {{name}} here is replaced with your name, as set on your account page, or “the user” if you have none.",
  limit: (max: number): string =>
    `At most ${max.toLocaleString("en-US")} characters.`,
  deleteConsequences: (
    sale: string | undefined,
  ): typeof BOUGHT_DELETION | typeof LISTED_DELETION | "" => {
    if (sale === "bought") {
      return BOUGHT_DELETION;
    }
    if (sale === "listed") {
      return LISTED_DELETION;
    }
    return "";
  },
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
    `This replaces your saved ${part} with ${resetTarget(source)}. Your own text can't be brought back. Existing chats keep their saved instructions, including spells they already cast.`,
  resetConfirm: (part: string): string => `Reset ${part}`,
  resetCancel: (part: string): string => `Keep my ${part}`,
} as const;
