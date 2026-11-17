"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/auth/current-user.ts";
import {
  checkNoteText,
  type NoteQuest,
  type NoteResult,
  SAVE_NOTE_REQUEST,
} from "@/notes/note.ts";
import { listNotes, saveNote } from "@/notes/note-store.ts";
import { listQuests } from "@/quests/store.ts";
import { QUICK_NOTE_COPY } from "@/ui/copy/notes.ts";

// The signed-in user's Active quests, newest first, for the Quick Note
// dialog to offer.
async function listNoteQuestsAction(): Promise<NoteQuest[]> {
  const user = await requireUser();
  const quests = await listQuests(user.id);
  return quests
    .filter((quest) => quest.status === "active")
    .map(({ id, name, sharing }) => ({ id, name, sharing }));
}

// Why a Quick Note wasn't saved, for the user.
function noteProblem(text: string): NoteResult {
  return { kind: "problem", text };
}

// Saves a Quick Note to one of the user's Active quests, or says why not.
// Saving makes no model request.
async function saveNoteAction(request: unknown): Promise<NoteResult> {
  const user = await requireUser();
  const parsed = SAVE_NOTE_REQUEST.safeParse(request);
  if (!parsed.success) {
    return noteProblem(QUICK_NOTE_COPY.invalid);
  }
  const checked = checkNoteText(parsed.data.text);
  if ("problem" in checked) {
    return noteProblem(QUICK_NOTE_COPY.problem(checked.problem));
  }
  const saved = await saveNote(user.id, {
    questId: parsed.data.questId,
    text: checked.text,
  });
  if (!saved) {
    return noteProblem(QUICK_NOTE_COPY.notFound);
  }
  const notes = await listNotes(user.id, parsed.data.questId);
  refresh();
  return { kind: "saved", notes };
}

export { listNoteQuestsAction, saveNoteAction };
