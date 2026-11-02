"use server";

import { type ZodError, z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { AppError, userMessage } from "@/errors/app-error.ts";
import { PROJECT_ID } from "@/ids.ts";
import { NOTE_TEXT, noteDay } from "@/notes/note.ts";
import { saveNote } from "@/notes/note-store.ts";
import { getProject } from "@/projects/store.ts";
import { QUICK_CAPTURE_COPY } from "@/ui/copy/notes.ts";

// What the last save did: nothing yet; saved to the named project; refused
// because the note is empty or too long; or failed, as when the project is
// gone or the storage can't be reached. A refused or failed note was not
// saved, and the form still holds its text.
type QuickCaptureState =
  | { readonly kind: "idle" }
  | { readonly kind: "saved"; readonly projectName: string }
  | { readonly kind: "invalid"; readonly message: string }
  | { readonly kind: "failed"; readonly message: string };

const QUICK_CAPTURE_FORM = z.object({
  projectId: PROJECT_ID,
  text: z.string(),
  day: z.string().optional(),
});

// Why the note's text was refused, in the user's words.
function refusal(error: ZodError): QuickCaptureState {
  if (error.issues.some(({ code }) => code === "too_big")) {
    return { kind: "invalid", message: QUICK_CAPTURE_COPY.tooLong };
  }
  return { kind: "invalid", message: QUICK_CAPTURE_COPY.empty };
}

const NOT_FOUND: QuickCaptureState = {
  kind: "failed",
  message: userMessage("not-found"),
};

async function saveFromForm(formData: FormData): Promise<QuickCaptureState> {
  const user = await requireUser();
  const form = QUICK_CAPTURE_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    return NOT_FOUND;
  }
  const text = NOTE_TEXT.safeParse(form.data.text);
  if (!text.success) {
    return refusal(text.error);
  }
  const project = await getProject(user.id, form.data.projectId);
  if (project === undefined) {
    return NOT_FOUND;
  }
  const note = { day: noteDay(form.data.day, new Date()), text: text.data };
  if (!(await saveNote(user.id, { projectId: project.id, note }))) {
    return NOT_FOUND;
  }
  return { kind: "saved", projectName: project.name };
}

export type { QuickCaptureState };

// Saves the note to the end of the chosen project's memory, dated with the
// day the browser sent, and calls no model. An empty or too long note is
// refused. A project that is malformed, unknown or another user's, or a
// storage failure, fails with its message instead of reaching the error
// boundary, so the form keeps the note's text.
export async function saveNoteAction(
  _state: QuickCaptureState,
  formData: FormData,
): Promise<QuickCaptureState> {
  try {
    return await saveFromForm(formData);
  } catch (error) {
    if (error instanceof AppError) {
      return { kind: "failed", message: error.message };
    }
    throw error;
  }
}
