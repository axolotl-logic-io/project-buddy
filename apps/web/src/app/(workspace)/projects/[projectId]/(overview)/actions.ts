"use server";

import { refresh } from "next/cache";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { startQuestConversation } from "@/conversations/start-quest.ts";
import { userMessage } from "@/errors/app-error.ts";
import { MILESTONE_ID, PROJECT_ID } from "@/ids.ts";
import {
  MILESTONE_TEXT,
  MILESTONE_TEXT_MAX_LENGTH,
} from "@/milestones/milestone.ts";
import {
  deleteMilestone,
  editMilestone,
} from "@/milestones/milestone-store.ts";
import { OPENING_COPY } from "@/ui/copy/chat.ts";
import { PROGRESS_TIMELINE_COPY } from "@/ui/copy/milestones.ts";

const PROJECT_FORM = z.object({ projectId: PROJECT_ID });

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

// What came of starting a quest's conversation: nothing yet, or why it
// didn't start. Starting it refreshes the page, which then shows it.
type StartConversationState =
  | { readonly kind: "idle" }
  | {
      readonly kind: "claudeUnavailable" | "outOfGold";
      readonly message: string;
    };

export type { EditMilestoneResult, EditMilestoneState, StartConversationState };

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

// Starts the quest's one conversation, with its opening, charged to the
// acting user, for a quest that has none yet, as after the move from
// adventures. Starting one that has started, as from a second tab, writes
// no second opening. A quest that isn't the user's is not found.
export async function startConversationAction(
  _state: StartConversationState,
  formData: FormData,
): Promise<StartConversationState> {
  const user = await requireUser();
  const form = PROJECT_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    notFound();
  }
  const result = await startQuestConversation(user.id, form.data.projectId);
  if (result.kind === "notFound") {
    notFound();
  }
  if (result.kind === "outOfGold") {
    return { kind: "outOfGold", message: userMessage("out-of-gold") };
  }
  if (result.kind === "claudeUnavailable") {
    return {
      kind: "claudeUnavailable",
      message: OPENING_COPY.claudeUnavailable,
    };
  }
  refresh();
  return { kind: "idle" };
}
