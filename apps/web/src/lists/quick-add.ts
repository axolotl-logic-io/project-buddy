// What Quick Add is: text the user adds to a list in one of their quests
// without opening it. The item takes the list's type. It imports nothing
// from the server, so forms and tests can use it.
import type { QuestSharing } from "@/quests/membership.ts";

// The longest Quick Add text, in characters, once trimmed: a note's
// limit. A list of items or tasks takes less, and says so when saving.
const QUICK_ADD_MAX_LENGTH = 1000;

// Why typed Quick Add text can't be saved.
type QuickAddTextProblem = "empty" | "too-long";

// The typed text as it would be saved, trimmed, or why it can't be.
function checkQuickAddText(
  typed: string,
): { readonly text: string } | { readonly problem: QuickAddTextProblem } {
  const text = typed.trim();
  if (text.length === 0) {
    return { problem: "empty" };
  }
  if (text.length > QUICK_ADD_MAX_LENGTH) {
    return { problem: "too-long" };
  }
  return { text };
}

// An Active quest Quick Add can add to, and how it is shared.
interface QuickAddTarget {
  readonly id: string;
  readonly name: string;
  readonly sharing: QuestSharing;
}

export type { QuickAddTarget, QuickAddTextProblem };
export { checkQuickAddText, QUICK_ADD_MAX_LENGTH };
