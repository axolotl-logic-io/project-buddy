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
// saved, and its answer holds the text and project as sent, so the form
// shows them again even when it was sent before the page's script ran.
type QuickCaptureState =
  | { readonly kind: "idle" }
  | { readonly kind: "saved"; readonly projectName: string }
  | {
      readonly kind: "invalid" | "failed";
      readonly message: string;
      readonly text: string;
      readonly projectId: string;
    };

const QUICK_CAPTURE_FORM = z.object({
  projectId: PROJECT_ID,
  text: z.string(),
  day: z.string().optional(),
});

// The text and project the form sent, as they came, to show again.
interface SentNote {
  readonly text: string;
  readonly projectId: string;
}

// A form field's text, or nothing for a missing or file field.
function fieldText(formData: FormData, name: string): string {
  const value = formData.get(name);
  if (typeof value === "string") {
    return value;
  }
  return "";
}

// Why the note's text was refused, in the user's words.
function refusal(error: ZodError, sent: SentNote): QuickCaptureState {
  if (error.issues.some(({ code }) => code === "too_big")) {
    return { kind: "invalid", message: QUICK_CAPTURE_COPY.tooLong, ...sent };
  }
  return { kind: "invalid", message: QUICK_CAPTURE_COPY.empty, ...sent };
}

function failed(message: string, sent: SentNote): QuickCaptureState {
  return { kind: "failed", message, ...sent };
}

async function saveFromForm(
  formData: FormData,
  sent: SentNote,
): Promise<QuickCaptureState> {
  const user = await requireUser();
  const form = QUICK_CAPTURE_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    return failed(userMessage("not-found"), sent);
  }
  const text = NOTE_TEXT.safeParse(form.data.text);
  if (!text.success) {
    return refusal(text.error, sent);
  }
  const project = await getProject(user.id, form.data.projectId);
  if (project === undefined) {
    return failed(userMessage("not-found"), sent);
  }
  const note = { day: noteDay(form.data.day, new Date()), text: text.data };
  if (!(await saveNote(user.id, { projectId: project.id, note }))) {
    return failed(userMessage("not-found"), sent);
  }
  return { kind: "saved", projectName: project.name };
}

export type { QuickCaptureState };

// Saves the note to the end of the chosen project's memory, dated with the
// day the browser sent (or, sent before the page's script ran, with none,
// the day in UTC), and calls no model. An empty or too long note is
// refused. A project that is malformed, unknown or another user's, or a
// storage failure, fails with its message instead of reaching the error
// boundary, so the form keeps the note's text.
export async function saveNoteAction(
  _state: QuickCaptureState,
  formData: FormData,
): Promise<QuickCaptureState> {
  const sent = {
    text: fieldText(formData, "text"),
    projectId: fieldText(formData, "projectId"),
  };
  try {
    return await saveFromForm(formData, sent);
  } catch (error) {
    if (error instanceof AppError) {
      return failed(error.message, sent);
    }
    throw error;
  }
}
