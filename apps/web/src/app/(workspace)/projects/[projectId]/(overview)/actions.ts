"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { EMAIL_FIELD, typedEmail } from "@/app/login/link-request.ts";
import type { LinkRequestState } from "@/app/login/link-request-state.ts";
import { requireUser } from "@/auth/current-user.ts";
import { CHECK_IN_FREQUENCY } from "@/check-ins/check-in-frequency.ts";
import { saveCheckInFrequency } from "@/check-ins/check-in-store.ts";
import { checkInsAreOn } from "@/check-ins/check-ins-enabled.ts";
import { startQuestConversation } from "@/conversations/start-quest.ts";
import { AppError, userMessage } from "@/errors/app-error.ts";
import { MILESTONE_ID, PROJECT_ID, USER_ID } from "@/ids.ts";
import {
  MILESTONE_TEXT,
  MILESTONE_TEXT_MAX_LENGTH,
} from "@/milestones/milestone.ts";
import {
  deleteMilestone,
  editMilestone,
} from "@/milestones/milestone-store.ts";
import { leaveProject, removeProjectMember } from "@/projects/members-store.ts";
import {
  type InviteOutcome,
  inviteToProject,
  revokeProjectInvitation,
} from "@/projects/project-invitations.ts";
import { OPENING_COPY } from "@/ui/copy/chat.ts";
import { CHECK_IN_SETTING_COPY } from "@/ui/copy/check-ins.ts";
import { PROGRESS_TIMELINE_COPY } from "@/ui/copy/milestones.ts";
import { PROJECT_INVITE_COPY } from "@/ui/copy/project-invitations.ts";

const CHECK_IN_SETTING_FORM = z.object({
  projectId: PROJECT_ID,
  frequency: CHECK_IN_FREQUENCY,
});

// The check-in setting's state: as first shown, saved, or refused because
// the form named no frequency or no project of hers. A storage failure
// throws, for the error boundary.
type CheckInSettingState =
  | { readonly kind: "idle" }
  | { readonly kind: "saved" }
  | { readonly kind: "invalid"; readonly message: string };

const INVALID: CheckInSettingState = {
  kind: "invalid",
  message: CHECK_IN_SETTING_COPY.invalid,
};

const PROJECT_FORM = z.object({ projectId: PROJECT_ID });

const REMOVE_MEMBER_FORM = PROJECT_FORM.extend({ memberId: USER_ID });

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

// What the invite form says for each outcome, about the address as typed.
function inviteAnswer(
  outcome: Exclude<InviteOutcome, "not-found">,
  email: string,
): Exclude<LinkRequestState, { kind: "idle" }> {
  const address = email.trim();
  switch (outcome) {
    case "taken":
      return {
        kind: "sent",
        message: PROJECT_INVITE_COPY.sent(address),
        email,
      };
    case "yourself":
      return {
        kind: "invalid",
        field: "email",
        message: PROJECT_INVITE_COPY.yourself,
        email,
      };
    case "already-member":
      return {
        kind: "invalid",
        field: "email",
        message: PROJECT_INVITE_COPY.alreadyMember(address),
        email,
      };
    case "limited":
      return { kind: "error", message: PROJECT_INVITE_COPY.limited, email };
    default:
      return outcome satisfies never;
  }
}

const REVOKE_FORM = z.object({ invitationId: z.string() });

// What came of starting a quest's conversation: nothing yet, or why it
// didn't start. Starting it refreshes the page, which then shows it.
type StartConversationState =
  | { readonly kind: "idle" }
  | {
      readonly kind: "claudeUnavailable" | "outOfGold";
      readonly message: string;
    };

export type {
  CheckInSettingState,
  EditMilestoneResult,
  EditMilestoneState,
  StartConversationState,
};

// Saves how often the construct checks in on her project. Until check-ins are
// on for the site (CRON_SECRET set), it saves nothing and says so.
export async function saveCheckInSettingAction(
  _state: CheckInSettingState,
  formData: FormData,
): Promise<CheckInSettingState> {
  const user = await requireUser();
  if (!checkInsAreOn()) {
    return { kind: "invalid", message: CHECK_IN_SETTING_COPY.unavailable };
  }
  const form = CHECK_IN_SETTING_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    return INVALID;
  }
  const { projectId, frequency } = form.data;
  if (!(await saveCheckInFrequency(user.id, projectId, frequency))) {
    return INVALID;
  }
  refresh();
  return { kind: "saved" };
}

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

// Invites the person with the form's address to her project, and says what
// happened: the same "if they have an account, we've sent them an
// invitation" for every address she may invite, so the answer never shows
// whether an address has an account; or refused, saying why, for her own
// address, a member's, a malformed one or past her limits. A sent invitation
// refreshes the page, so its Pending invitations list it. A project that
// isn't hers is not found, as is a malformed form. A storage failure is
// reported for her to try again.
export async function inviteToProjectAction(
  _state: LinkRequestState,
  formData: FormData,
): Promise<Exclude<LinkRequestState, { kind: "idle" }>> {
  const user = await requireUser();
  const projectId = PROJECT_ID.safeParse(formData.get("projectId")).data;
  if (projectId === undefined) {
    notFound();
  }
  const typed = typedEmail(formData);
  const parsed = EMAIL_FIELD.safeParse(typed);
  if (!parsed.success) {
    return {
      kind: "invalid",
      field: "email",
      message: PROJECT_INVITE_COPY.needsEmail,
      email: typed,
    };
  }
  let outcome: InviteOutcome;
  try {
    outcome = await inviteToProject(user, {
      projectId,
      email: parsed.data,
      requestHeaders: await headers(),
    });
  } catch (error) {
    if (error instanceof AppError) {
      return { kind: "error", message: error.message, email: typed };
    }
    throw error;
  }
  if (outcome === "not-found") {
    notFound();
  }
  if (outcome === "taken") {
    refresh();
  }
  return inviteAnswer(outcome, typed);
}

// Revokes her pending invitation to her project, so its invitee can't join
// with it. One that is answered, unknown or not hers is left as it is.
export async function revokeProjectInvitationAction(
  formData: FormData,
): Promise<void> {
  const user = await requireUser();
  const form = REVOKE_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    notFound();
  }
  await revokeProjectInvitation(user.id, form.data.invitationId);
  refresh();
}

// Takes the member out of her project, which ends their access at once.
// Removing someone who is no longer a member, or from a project that is
// not hers, changes nothing.
export async function removeMemberAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const form = REMOVE_MEMBER_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    notFound();
  }
  await removeProjectMember(user.id, form.data.projectId, form.data.memberId);
  refresh();
}

// Takes her out of a team project she is a member of, then shows her
// projects, since she can no longer open this one. Her own project, which
// she can't leave, is left as it is.
export async function leaveProjectAction(formData: FormData): Promise<never> {
  const user = await requireUser();
  const form = PROJECT_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    notFound();
  }
  await leaveProject(user.id, form.data.projectId);
  return redirect("/projects");
}

// Starts the quest's one conversation, with its opening, charged to the
// acting user, for a quest that has none yet, as after the move from
// adventures. Starting one that has started, as from a second tab, writes
// no second opening. A quest that isn't open to the user is not found.
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
