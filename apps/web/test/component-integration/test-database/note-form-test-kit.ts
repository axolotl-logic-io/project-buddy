// For server tests: quick capture's form and a project's note delete
// buttons, sent as the signed-in user sends them, through their Server
// Actions. The delete refreshes the page with next/cache's `refresh()`,
// which throws outside a Server Action, so a test file that deletes notes
// replaces it, as memory-form-test-kit.ts says.
import {
  type QuickCaptureState,
  saveNoteAction,
} from "@/app/(workspace)/capture/actions.ts";
import {
  type DeleteNoteState,
  deleteNoteAction,
} from "@/app/(workspace)/projects/[projectId]/(overview)/actions.ts";

// The form's fields, as the browser sends them.
function noteForm(fields: Record<string, string>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    form.set(key, value);
  }
  return form;
}

// Saves text as a note to the project from quick capture, dated with the
// browser's day, and says what the save did.
function saveFromQuickCapture(
  projectId: string,
  text: string,
  day: string,
): Promise<QuickCaptureState> {
  return saveNoteAction({ kind: "idle" }, noteForm({ projectId, text, day }));
}

// Deletes the note of that day and text from the project's notes.
function deleteFromNotes(
  projectId: string,
  note: { readonly day: string; readonly text: string },
): Promise<DeleteNoteState> {
  return deleteNoteAction({ kind: "idle" }, noteForm({ projectId, ...note }));
}

export { deleteFromNotes, saveFromQuickCapture };
