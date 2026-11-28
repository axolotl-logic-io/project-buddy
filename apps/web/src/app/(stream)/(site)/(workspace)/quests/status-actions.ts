"use server";

import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { AppError } from "@/errors/app-error.ts";
import { QUEST_ID } from "@/ids.ts";
import {
  QUEST_STATUS,
  STATUS_REVISION,
  type StatusActionState,
} from "@/quests/quest-status.ts";
import { changeQuestStatus } from "@/quests/quest-status-store.ts";
import { QUEST_STATUS_COPY } from "@/ui/copy/quest-status.ts";

const CHANGE_FORM = z.object({
  questId: QUEST_ID,
  fromStatus: QUEST_STATUS,
  toStatus: QUEST_STATUS,
  revision: z.coerce.number().pipe(STATUS_REVISION),
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

export { changeQuestStatusAction };
