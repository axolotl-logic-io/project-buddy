"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { linkOrigin } from "@/accounts/emailed-link.ts";
import { EMAIL_FIELD } from "@/app/login/link-request.ts";
import { requireUser } from "@/auth/current-user.ts";
import { QUEST_ID, USER_ID } from "@/ids.ts";
import type { InviteState, MembershipResult } from "@/quests/membership.ts";
import {
  answerInvitation,
  inviteToQuest,
  removeFromQuest,
} from "@/quests/membership-store.ts";
import { HOME_PATH } from "@/routes.ts";
import { QUEST_MEMBERS_COPY } from "@/ui/copy/quest-members.ts";

const INVITE_FORM = z.object({ questId: QUEST_ID, email: z.unknown() });
const REMOVE_REQUEST = z.object({ questId: QUEST_ID, person: USER_ID });
const ANSWER_REQUEST = z.object({ questId: QUEST_ID, accept: z.boolean() });

// Invites the address the form holds to the form's quest, as the signed-in
// user, and says what came of it. The emailed link leads to this site.
async function inviteToQuestAction(
  _state: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const user = await requireUser();
  const form = INVITE_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    return { kind: "problem", message: QUEST_MEMBERS_COPY.notFound };
  }
  const email = EMAIL_FIELD.safeParse(form.data.email);
  if (!email.success) {
    return { kind: "invalid", message: QUEST_MEMBERS_COPY.needsEmail };
  }
  const result = await inviteToQuest(
    user.id,
    {
      questId: form.data.questId,
      email: email.data,
      origin: linkOrigin(await headers()),
    },
    new Date(),
  );
  switch (result.kind) {
    case "invited":
      refresh();
      return {
        kind: "done",
        message: QUEST_MEMBERS_COPY.invitedNotice(email.data),
      };
    case "unsent":
      refresh();
      return {
        kind: "problem",
        message: QUEST_MEMBERS_COPY.unsent(email.data),
      };
    case "in-quest":
      return { kind: "done", message: QUEST_MEMBERS_COPY.inQuest(email.data) };
    case "limited":
      return { kind: "problem", message: QUEST_MEMBERS_COPY.limited };
    case "not-found":
      return { kind: "problem", message: QUEST_MEMBERS_COPY.notFound };
    default:
      return result satisfies never;
  }
}

// Removes a member, or withdraws a pending invitation, from a quest open to
// the signed-in user. Removing themselves leaves the quest, and opens
// Quests, since the quest is no longer theirs to see.
async function removeFromQuestAction(
  request: unknown,
): Promise<MembershipResult> {
  const user = await requireUser();
  const parsed = REMOVE_REQUEST.safeParse(request);
  if (!parsed.success) {
    return { kind: "failed" };
  }
  const removed = await removeFromQuest(user.id, parsed.data);
  if (!removed) {
    return { kind: "failed" };
  }
  if (parsed.data.person === user.id) {
    redirect(HOME_PATH);
  }
  refresh();
  return { kind: "done" };
}

// Accepts or declines the signed-in user's pending invitation to one quest,
// leaving their other invitations pending.
async function answerInvitationAction(
  request: unknown,
): Promise<MembershipResult> {
  const user = await requireUser();
  const parsed = ANSWER_REQUEST.safeParse(request);
  if (!parsed.success) {
    return { kind: "failed" };
  }
  const answered = await answerInvitation(
    user.id,
    parsed.data.questId,
    parsed.data.accept,
  );
  if (!answered) {
    return { kind: "failed" };
  }
  refresh();
  return { kind: "done" };
}

export { answerInvitationAction, inviteToQuestAction, removeFromQuestAction };
