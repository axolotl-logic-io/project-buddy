"use server";

import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import type { QuestActionResult } from "@/components/use-quest-action.ts";
import { QUEST_ID } from "@/ids.ts";
import { HOME_COPY } from "@/ui/copy/home.ts";
import { markTaskPeriod } from "./streak-store.ts";

const MARK_REQUEST = z.object({
  questId: QUEST_ID,
  localDate: z.iso.date(),
  number: z.number().int().positive(),
  done: z.boolean(),
});

// Home's change of whether a recurring task was done in an earlier day, week
// or month.
async function markTaskPeriodAction(
  request: unknown,
): Promise<QuestActionResult> {
  const user = await requireUser();
  const change = MARK_REQUEST.safeParse(request).data;
  if (change === undefined) {
    return { kind: "problem", text: HOME_COPY.markUnavailable };
  }
  const marked = await markTaskPeriod(user.id, change.questId, change);
  if (!marked) {
    return { kind: "problem", text: HOME_COPY.markUnavailable };
  }
  return { kind: "saved" };
}

export { markTaskPeriodAction };
