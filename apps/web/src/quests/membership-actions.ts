"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { QUEST_ID } from "@/ids.ts";
import type { MembershipResult } from "@/quests/membership.ts";
import { answerInvitation } from "@/quests/membership-store.ts";

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

export { answerInvitationAction };
