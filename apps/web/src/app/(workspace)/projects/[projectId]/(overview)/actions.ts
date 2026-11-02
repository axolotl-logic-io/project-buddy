"use server";

import { refresh } from "next/cache";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { AppError, userMessage } from "@/errors/app-error.ts";
import { PROJECT_ID } from "@/ids.ts";
import { LISTED_NOTE_TEXT, NOTE_DAY } from "@/notes/note.ts";
import { deleteNote } from "@/notes/note-store.ts";
import { PROJECT_NOTES_COPY } from "@/ui/copy/notes.ts";

// What the last delete from a project's notes did: nothing yet; deleted;
// nothing deleted, since the memory no longer holds the note; or failed,
// as when the project is gone or the storage can't be reached. Each delete
// answers with a new state, so the list can tell one from the next.
type DeleteNoteState =
  | { readonly kind: "idle" | "deleted" }
  | { readonly kind: "missing" | "failed"; readonly message: string };

// The note as the page listed it, which may not follow a new note's rules,
// as when the buddy wrote it: its text is matched exactly as it is.
const DELETE_NOTE_FORM = z.object({
  projectId: PROJECT_ID,
  day: NOTE_DAY,
  text: LISTED_NOTE_TEXT,
});

async function deleteFromForm(formData: FormData): Promise<DeleteNoteState> {
  const user = await requireUser();
  const form = DELETE_NOTE_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    notFound();
  }
  const { projectId, day, text } = form.data;
  const result = await deleteNote(user.id, { projectId, note: { day, text } });
  refresh();
  switch (result) {
    case "deleted":
      return { kind: "deleted" };
    case "missing":
      return { kind: "missing", message: PROJECT_NOTES_COPY.missing };
    case "not-found":
      return { kind: "failed", message: userMessage("not-found") };
    default:
      return result satisfies never;
  }
}

export type { DeleteNoteState };

// Takes the note out of the project's memory, as a new version by the user,
// refreshes the page, and says what it did. A note the memory no longer
// holds, or a project of another user's, is left as it is, and the answer
// says nothing was deleted. A storage failure answers with its message. A
// malformed form is not found.
export async function deleteNoteAction(
  _state: DeleteNoteState,
  formData: FormData,
): Promise<DeleteNoteState> {
  try {
    return await deleteFromForm(formData);
  } catch (error) {
    if (error instanceof AppError) {
      return { kind: "failed", message: error.message };
    }
    throw error;
  }
}
