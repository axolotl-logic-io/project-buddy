"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { linkOrigin } from "@/accounts/emailed-link.ts";
import { EMAIL_FIELD } from "@/app/login/link-request.ts";
import { requireUser } from "@/auth/current-user.ts";
import type { QuestActionResult } from "@/components/use-quest-action.ts";
import { QUEST_ID, USER_ID } from "@/ids.ts";
import type { MembershipResult } from "@/quests/membership.ts";
import {
  answerInvitation,
  inviteToQuest,
  removeFromQuest,
} from "@/quests/membership-store.ts";
import { PANEL_COMMANDS_COPY } from "@/ui/copy/commands.ts";
import { QUEST_MEMBERS_COPY } from "@/ui/copy/quest-members.ts";

const ANSWER_REQUEST = z.object({ questId: QUEST_ID, accept: z.boolean() });

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
  // Either way Pending is out of date: refreshing drops an invitation
  // that was withdrawn or answered elsewhere, and updates its count.
  refresh();
  if (!answered) {
    return { kind: "failed" };
  }
  return { kind: "done" };
}

const INVITE_REQUEST = z.object({ questId: QUEST_ID, email: EMAIL_FIELD });
const REMOVE_REQUEST = z.object({ questId: QUEST_ID, person: USER_ID });

async function inviteToQuestAction(
  request: unknown,
): Promise<QuestActionResult> {
  const user = await requireUser();
  const invite = INVITE_REQUEST.safeParse(request).data;
  if (invite === undefined) {
    return { kind: "problem", text: PANEL_COMMANDS_COPY.problems.noEmail };
  }
  const result = await inviteToQuest(
    user.id,
    {
      ...invite,
      origin: linkOrigin(await headers()),
    },
    new Date(),
  );
  switch (result.kind) {
    case "invited":
    case "unsent":
      refresh();
      return {
        kind: "saved",
        message: PANEL_COMMANDS_COPY.notes[result.kind](invite.email),
      };
    case "in-quest":
      return {
        kind: "problem",
        text: QUEST_MEMBERS_COPY.inQuest(invite.email),
      };
    case "limited":
      return { kind: "problem", text: QUEST_MEMBERS_COPY.limited };
    case "not-found":
      return { kind: "problem", text: QUEST_MEMBERS_COPY.notFound };
    default:
      return result satisfies never;
  }
}

async function removeFromQuestAction(
  request: unknown,
): Promise<QuestActionResult> {
  const user = await requireUser();
  const remove = REMOVE_REQUEST.safeParse(request).data;
  if (remove === undefined || !(await removeFromQuest(user.id, remove))) {
    return { kind: "problem", text: QUEST_MEMBERS_COPY.failed };
  }
  if (remove.person !== user.id) {
    refresh();
  }
  return { kind: "saved", message: QUEST_MEMBERS_COPY.removed };
}

export { answerInvitationAction, inviteToQuestAction, removeFromQuestAction };
