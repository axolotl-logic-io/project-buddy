"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { chosenActivity } from "@/activities/chosen-activity.ts";
import {
  DEFAULT_ACTIVITY_ID,
  INTERVIEW_ACTIVITY_ID,
} from "@/activities/index.ts";
import { requireUser } from "@/auth/current-user.ts";
import { chosenBuddy } from "@/buddies/chosen-buddy.ts";
import type { BuddyId } from "@/buddies/index.ts";
import { startChat } from "@/chats/start-chat.ts";
import { type OwnPromptId, type ProjectId, parseProjectId } from "@/ids.ts";
import { getProject, type Project } from "@/projects/store.ts";
import {
  NEW_CHAT_COPY,
  OPENING_COPY,
  quotaUsedUpMessage,
} from "@/ui/copy/chat.ts";

// The form: a project, or "" for none, an activity and a buddy, each by id.
// A missing activity is the default one.
const START_CHAT_FORM = z.object({
  projectId: z.string().default(""),
  activityId: z.string().default(DEFAULT_ACTIVITY_ID),
  buddyId: z.string({ error: NEW_CHAT_COPY.chooseBuddy }),
});

// The choices the form shows again after Claude couldn't start the chat.
interface StartChatChoices {
  readonly projectId: ProjectId | undefined;
  readonly activityId: string;
  readonly buddyId: BuddyId | OwnPromptId;
}

// The new-chat form's state: as first shown, after a submission without a
// known project, activity or buddy, or after Claude couldn't open the chat,
// so nothing was started and the form shows her choices again, or after her
// monthly quota was found used up, so nothing was started. A storage failure
// throws, for the error boundary.
type StartChatState =
  | { readonly kind: "idle" }
  | { readonly kind: "invalid"; readonly message: string }
  | ({
      readonly kind: "claudeUnavailable";
      readonly message: string;
    } & StartChatChoices)
  | { readonly kind: "quotaUsedUp"; readonly message: string };

// The owner's project with this id, or undefined for none; false when the id
// names no project of hers.
async function chosenProject(
  owner: Parameters<typeof getProject>[0],
  projectId: string,
): Promise<Project | undefined | false> {
  if (projectId === "") {
    return undefined;
  }
  const project = await getProject(owner, projectId);
  return project ?? false;
}

// Starts the chat, in its project or in none, in its activity and buddy,
// with the buddy's opening, and opens it. Or says what the form is missing,
// that Claude is unavailable, or that her quota is used up and when it
// resets. A project, activity or buddy of another user's reads as an unknown
// one. The interview needs a project's memory, so it can't start a chat
// with no project.
async function startChatAction(
  _state: StartChatState,
  formData: FormData,
): Promise<StartChatState> {
  const user = await requireUser();
  const form = START_CHAT_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    return { kind: "invalid", message: NEW_CHAT_COPY.chooseBuddy };
  }
  const [project, activity, buddy] = await Promise.all([
    chosenProject(user.id, form.data.projectId),
    chosenActivity(user.id, form.data.activityId),
    chosenBuddy(user.id, form.data.buddyId),
  ]);
  if (project === false) {
    return { kind: "invalid", message: NEW_CHAT_COPY.chooseProject };
  }
  if (activity === undefined) {
    return { kind: "invalid", message: NEW_CHAT_COPY.chooseActivity };
  }
  if (activity.id === INTERVIEW_ACTIVITY_ID && project === undefined) {
    return { kind: "invalid", message: NEW_CHAT_COPY.interviewNeedsProject };
  }
  if (buddy === undefined) {
    return { kind: "invalid", message: NEW_CHAT_COPY.chooseBuddy };
  }
  const started = await startChat(user.id, {
    project,
    buddy: buddy.buddy,
    activity,
  });
  if (started.kind === "claudeUnavailable") {
    return {
      kind: "claudeUnavailable",
      message: OPENING_COPY.claudeUnavailable,
      projectId: parseProjectId(form.data.projectId),
      activityId: activity.id,
      buddyId: buddy.id,
    };
  }
  if (started.kind === "quotaUsedUp") {
    return {
      kind: "quotaUsedUp",
      message: quotaUsedUpMessage(started.resetsOn),
    };
  }
  return redirect(`/chats/${started.chat.id}`);
}

export type { StartChatState };
export { startChatAction };
