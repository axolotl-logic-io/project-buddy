// What a Quick Note is: a short line the user saves to one of their quests
// without opening it, with when they saved it. It imports nothing from the
// server, so forms and tests can use it.
import { z } from "zod";
import { QUEST_ID } from "@/ids.ts";
import type { QuestSharing } from "@/quests/membership.ts";

// The longest Quick Note, in characters, once trimmed.
const NOTE_MAX_LENGTH = 1000;

const NOTE_ID = z.uuid().brand<"NoteId">();
type NoteId = z.infer<typeof NOTE_ID>;

interface Note {
  readonly id: NoteId;
  readonly text: string;
  readonly savedAt: Date;
}

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

// A Quick Note to save, before its text is checked.
const SAVE_NOTE_REQUEST = z.object({ questId: QUEST_ID, text: z.string() });

const DELETE_NOTE_REQUEST = z.object({ questId: QUEST_ID, id: NOTE_ID });

// What a save or delete did: done, or a reason for the user.
type NoteResult =
  | { readonly kind: "saved" | "deleted" }
  | { readonly kind: "problem"; readonly text: string };

// An Active quest a Quick Note can go to, and how it is shared.
interface NoteQuest {
  readonly id: string;
  readonly name: string;
  readonly sharing: QuestSharing;
}

export type { Note, NoteId, NoteQuest, NoteResult, NoteTextProblem };
export {
  checkNoteText,
  DELETE_NOTE_REQUEST,
  NOTE_ID,
  NOTE_MAX_LENGTH,
  SAVE_NOTE_REQUEST,
};
