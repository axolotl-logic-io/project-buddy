"use server";

import { refresh } from "next/cache";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { MILESTONE_ID } from "@/ids.ts";
import {
  MILESTONE_TEXT,
  MILESTONE_TEXT_MAX_LENGTH,
} from "@/milestones/milestone.ts";
import {
  deleteMilestone,
  editMilestone,
} from "@/milestones/milestone-store.ts";
import { PROGRESS_TIMELINE_COPY } from "@/ui/copy/milestones.ts";

const MILESTONE_FORM = z.object({ milestoneId: MILESTONE_ID });

const EDIT_MILESTONE_FORM = MILESTONE_FORM.extend({ text: z.string() });

// What an edit did: saved the milestone's new text, or refused it, saying
// why. A storage failure throws, for the error boundary.
type EditMilestoneResult =
  | { readonly kind: "saved" }
  | { readonly kind: "invalid"; readonly message: string };

// The edit form's state: as first shown, or after an edit.
type EditMilestoneState = { readonly kind: "idle" } | EditMilestoneResult;

// What the form says for text MILESTONE_TEXT refuses.
function refusal(text: string): string {
  if (text.trim() === "") {
    return PROGRESS_TIMELINE_COPY.needsText;
  }
  return PROGRESS_TIMELINE_COPY.tooLong(MILESTONE_TEXT_MAX_LENGTH);
}

export type { EditMilestoneResult, EditMilestoneState };

// Saves her text as the milestone's, keeping its date and chat, or says why
// the text won't do. A milestone whose id is malformed, unknown or another
// user's is not found.
export async function editMilestoneAction(
  _state: EditMilestoneState,
  formData: FormData,
): Promise<EditMilestoneResult> {
  const user = await requireUser();
  const form = EDIT_MILESTONE_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    notFound();
  }
  const text = MILESTONE_TEXT.safeParse(form.data.text);
  if (!text.success) {
    return { kind: "invalid", message: refusal(form.data.text) };
  }
  if (!(await editMilestone(user.id, form.data.milestoneId, text.data))) {
    notFound();
  }
  refresh();
  return { kind: "saved" };
}

// Deletes the milestone from its project's progress timeline. One that is
// gone, or another user's, is left as it is.
export async function deleteMilestoneAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const form = MILESTONE_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    notFound();
  }
  await deleteMilestone(user.id, form.data.milestoneId);
  refresh();
}
