"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { AppError } from "@/errors/app-error.ts";
import { PROJECT_ID } from "@/ids.ts";
import {
  QUEST_STATUS,
  STATUS_APPROVAL_ID,
  STATUS_REVISION,
  type StatusActionState,
  type StatusApproval,
} from "@/projects/quest-status.ts";
import {
  answerStatusApproval,
  changeQuestStatus,
  readStatusApproval,
} from "@/projects/quest-status-store.ts";
import { QUEST_STATUS_COPY } from "@/ui/copy/quest-status.ts";

const CHANGE_FORM = z.object({
  projectId: PROJECT_ID,
  fromStatus: QUEST_STATUS,
  toStatus: QUEST_STATUS,
  revision: z.coerce.number().pipe(STATUS_REVISION),
});
const ANSWER_FORM = z.object({
  id: STATUS_APPROVAL_ID,
  decision: z.enum(["approve", "decline"]),
});
const INVALID: StatusActionState = {
  kind: "invalid",
  message: QUEST_STATUS_COPY.failed,
};

async function changeQuestStatusAction(
  _state: StatusActionState,
  formData: FormData,
): Promise<StatusActionState> {
  const user = await requireUser();
  const input = CHANGE_FORM.safeParse(Object.fromEntries(formData));
  if (!input.success) {
    return INVALID;
  }
  try {
    const change = await changeQuestStatus(user.id, input.data);
    if (change === undefined) {
      return INVALID;
    }
    refresh();
    return {
      kind: "saved",
      change,
      message: QUEST_STATUS_COPY.saved[change.toStatus],
    };
  } catch (error) {
    if (error instanceof AppError) {
      return { kind: "invalid", message: error.message };
    }
    throw error;
  }
}

async function answerQuestStatusAction(
  _state: StatusActionState,
  formData: FormData,
): Promise<StatusActionState> {
  const user = await requireUser();
  const input = ANSWER_FORM.safeParse(Object.fromEntries(formData));
  if (!input.success) {
    return INVALID;
  }
  try {
    const change = await answerStatusApproval(
      user.id,
      input.data.id,
      input.data.decision === "approve",
    );
    const approval = await readStatusApproval(user.id, input.data.id);
    if (approval === undefined) {
      return INVALID;
    }
    refresh();
    return { kind: "saved", change, approval };
  } catch (error) {
    if (error instanceof AppError) {
      return { kind: "invalid", message: error.message };
    }
    throw error;
  }
}

async function readQuestStatusApprovalAction(
  id: unknown,
): Promise<StatusApproval | undefined> {
  const user = await requireUser();
  const parsed = STATUS_APPROVAL_ID.safeParse(id);
  if (!parsed.success) {
    return undefined;
  }
  return readStatusApproval(user.id, parsed.data);
}

export {
  answerQuestStatusAction,
  changeQuestStatusAction,
  readQuestStatusApprovalAction,
};
