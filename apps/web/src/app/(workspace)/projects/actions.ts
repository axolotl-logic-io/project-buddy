"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { getUserBuddy } from "@/buddies/buddy-store.ts";
import {
  type BuddyId,
  DEFAULT_BUDDY_ID,
  getBuddy,
  isBuddyId,
} from "@/buddies/index.ts";
import type { NewChatBuddy } from "@/chats/new-chat-store.ts";
import { startProject } from "@/chats/start-chat.ts";
import type { UserBuddyId, UserId } from "@/ids.ts";
import { PROJECT_NAME } from "@/projects/project-name.ts";
import { OPENING_COPY, quotaUsedUpMessage } from "@/ui/copy/chat.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

// The name follows the shared rule; its issues read as needsName through
// the parse's error map, which the buddy's own message overrides.
const CREATE_PROJECT_FORM = z.object({
  name: PROJECT_NAME,
  buddyId: z.string({ error: PROJECTS_COPY.chooseBuddy }).optional(),
});

function needsName(): string {
  return PROJECTS_COPY.needsName;
}

// The buddy the form chose, by its id, and the buddy the interview chat
// keeps for it: the default buddy when the form sent none, a built-in
// buddy, or a snapshot of one of the owner's own, saved under the default
// buddy's id as a new chat's is. Undefined for anything else, such as
// another user's buddy.
async function interviewBuddy(
  owner: UserId,
  buddyId: string | undefined,
): Promise<
  | { readonly id: BuddyId | UserBuddyId; readonly buddy: NewChatBuddy }
  | undefined
> {
  if (buddyId === undefined) {
    return { id: DEFAULT_BUDDY_ID, buddy: getBuddy(DEFAULT_BUDDY_ID) };
  }
  if (isBuddyId(buddyId)) {
    return { id: buddyId, buddy: getBuddy(buddyId) };
  }
  const own = await getUserBuddy(owner, buddyId);
  if (own === undefined) {
    return undefined;
  }
  return {
    id: own.id,
    buddy: { id: DEFAULT_BUDDY_ID, name: own.name, parts: own.parts },
  };
}

// The new-project form's state: as first shown, after a submission without
// a name or with a buddy that is neither built-in nor hers, or after
// Claude couldn't open the project's first chat, so nothing was created and
// the form shows the name and buddy she chose again, or after her
// monthly quota was found used up, so nothing was created. A storage failure
// throws, for the error boundary.
export type CreateProjectState =
  | { readonly kind: "idle" }
  | { readonly kind: "invalid"; readonly message: string }
  | {
      readonly kind: "claudeUnavailable";
      readonly message: string;
      readonly name: string;
      readonly buddyId: BuddyId | UserBuddyId;
    }
  | { readonly kind: "quotaUsedUp"; readonly message: string };

// Creates the project and its first chat, in the buddy she chose (or the
// default buddy when the form sends none), then
// opens the chat, where the tutor's opening starts the project's interview.
// Or says what the form is missing, that Claude is unavailable, or that her
// quota is used up and when it resets.
export async function createProjectAction(
  _state: CreateProjectState,
  formData: FormData,
): Promise<CreateProjectState> {
  const user = await requireUser();
  const form = CREATE_PROJECT_FORM.safeParse(Object.fromEntries(formData), {
    error: needsName,
  });
  if (!form.success) {
    const [firstIssue] = form.error.issues;
    return {
      kind: "invalid",
      message: firstIssue?.message ?? PROJECTS_COPY.needsName,
    };
  }

  const chosen = await interviewBuddy(user.id, form.data.buddyId);
  if (chosen === undefined) {
    return { kind: "invalid", message: PROJECTS_COPY.chooseBuddy };
  }

  const started = await startProject(user.id, form.data.name, chosen.buddy);
  if (started.kind === "claudeUnavailable") {
    return {
      kind: "claudeUnavailable",
      message: OPENING_COPY.claudeUnavailable,
      name: form.data.name,
      buddyId: chosen.id,
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
