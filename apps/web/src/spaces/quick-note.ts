// What a Quick Note is: a short line the user saves to one of their quests
// without opening it, with when they saved it. It imports nothing from the
// server, so forms and tests can use it.
import type { QuestSharing } from "@/quests/membership.ts";

// The longest Quick Note, in characters, once trimmed.
const NOTE_MAX_LENGTH = 1000;

// Why a typed Quick Note can't be saved.
type NoteTextProblem = "empty" | "too-long";

// The typed text as it would be saved, trimmed, or why it can't be.
function checkNoteText(
  typed: string,
): { readonly text: string } | { readonly problem: NoteTextProblem } {
  const text = typed.trim();
  if (text.length === 0) {
    return { problem: "empty" };
  }
  if (text.length > NOTE_MAX_LENGTH) {
    return { problem: "too-long" };
  }
  return { text };
}

// An Active quest a Quick Note can go to, and how it is shared.
interface NoteQuest {
  readonly id: string;
  readonly name: string;
  readonly sharing: QuestSharing;
}

export type { NoteQuest, NoteTextProblem };
export { checkNoteText, NOTE_MAX_LENGTH };
