"use server";

import { refresh } from "next/cache";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { PROJECT_ID } from "@/ids.ts";
import { NOTE_DAY, NOTE_TEXT } from "@/notes/note.ts";
import { deleteNote } from "@/notes/note-store.ts";

// What the last delete from a project's notes did: nothing yet, or deleted.
// Each delete answers with a new state, so the list can tell one from the
// next.
interface DeleteNoteState {
  readonly kind: "idle" | "deleted";
}

const DELETE_NOTE_FORM = z.object({
  projectId: PROJECT_ID,
  day: NOTE_DAY,
  text: NOTE_TEXT,
});

export type { DeleteNoteState };

// Takes the note out of the project's memory, as a new version by the user,
// and refreshes the page. A note already gone, or a project of another
// user's, is left as it is. A malformed form is not found.
export async function deleteNoteAction(
  _state: DeleteNoteState,
  formData: FormData,
): Promise<DeleteNoteState> {
  const user = await requireUser();
  const form = DELETE_NOTE_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    notFound();
  }
  const { projectId, day, text } = form.data;
  await deleteNote(user.id, { projectId, note: { day, text } });
  refresh();
  return { kind: "deleted" };
}
