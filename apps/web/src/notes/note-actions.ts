"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/auth/current-user.ts";
import {
  checkNoteText,
  DELETE_NOTE_REQUEST,
  type NoteQuest,
  type NoteResult,
  SAVE_NOTE_REQUEST,
} from "@/notes/note.ts";
import { deleteNote, saveNote } from "@/notes/note-store.ts";
import { listQuests } from "@/quests/store.ts";
import { QUICK_NOTE_COPY } from "@/ui/copy/notes.ts";

// The signed-in user's Active quests, newest first, for the Quick Note
// dialog to offer.
async function listNoteQuestsAction(): Promise<NoteQuest[]> {
  const user = await requireUser();
  const quests = await listQuests(user.id);
  return quests
    .filter((quest) => quest.status === "active")
    .map(({ id, name }) => ({ id, name }));
}

// Saves a Quick Note to one of the user's Active quests, or says why not.
// Saving makes no model request.
async function saveNoteAction(request: unknown): Promise<NoteResult> {
  const user = await requireUser();
  const parsed = SAVE_NOTE_REQUEST.safeParse(request);
  if (!parsed.success) {
    return { kind: "problem", text: QUICK_NOTE_COPY.invalid };
  }
  const checked = checkNoteText(parsed.data.text);
  if ("problem" in checked) {
    return { kind: "problem", text: QUICK_NOTE_COPY.problem(checked.problem) };
  }
  const saved = await saveNote(user.id, {
    questId: parsed.data.questId,
    text: checked.text,
  });
  if (!saved) {
    return { kind: "problem", text: QUICK_NOTE_COPY.notFound };
  }
  refresh();
  return { kind: "saved" };
}

// Deletes one of the user's Quick Notes. A note already gone, or another
// user's, is left as it is, and the answer is the same.
async function deleteNoteAction(request: unknown): Promise<NoteResult> {
  const user = await requireUser();
  const parsed = DELETE_NOTE_REQUEST.safeParse(request);
  if (parsed.success) {
    await deleteNote(user.id, parsed.data);
    refresh();
  }
  return { kind: "deleted" };
}

export { deleteNoteAction, listNoteQuestsAction, saveNoteAction };
