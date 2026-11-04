const BOUGHT_DELETION =
  " You bought this copy, or cloned a bought copy. Deleting it gives no refund. You can clone any copy you still have for free. If you have no other copy, getting it again costs the listing’s current price, if it is still listed; its instructions may have changed.";
const LISTED_DELETION =
  " Published listings stay available until you unlist them from the Marketplace.";

// The text every prompt's page shares, a buddy's, an activity's or a
// spell's.
export const PROMPT_COPY = {
  nameLabel: "Name",
  promptHeading: "Prompt",
  activityFieldsHeading: "Instructions and opening request",
  spellFieldsHeading: "When to use and instructions",
  activityResetHint:
    "Reset restores only the instructions. The name and opening request stay as written.",
  spellResetHint:
    "Reset restores only the instructions. The name and when-to-use description stay as written.",
  namePlaceholderHint:
    "Any {{name}} here is replaced with your name, as set on your account page, or “the user” if you have none.",
  limit: (max: number): string =>
    `At most ${max.toLocaleString("en-US")} characters.`,
  boughtResetHint:
    "This copy came from the Marketplace. Reset is unavailable to protect its purchased instructions.",
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
  deleted: "Deleted. Existing chats keep their saved instructions.",
  save: "Save",
  reset: "Reset to default",
  resetLabel: (part: string): string => `Reset ${part} to default`,
} as const;
