"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import type { QuestActionResult } from "@/components/use-quest-action.ts";
import { MILESTONE_ID } from "@/ids.ts";
import {
  MILESTONE_TEXT,
  MILESTONE_TEXT_MAX_LENGTH,
} from "@/milestones/milestone.ts";
import {
  deleteMilestone,
  editMilestone,
} from "@/milestones/milestone-store.ts";
import { PROGRESS_TIMELINE_COPY } from "@/ui/copy/milestones.ts";

const MILESTONE_CHANGE = z.object({
  id: MILESTONE_ID,
  text: z.string().optional(),
});

async function changeMilestoneAction(
  request: unknown,
): Promise<QuestActionResult> {
  const user = await requireUser();
  const change = MILESTONE_CHANGE.safeParse(request).data;
  if (change === undefined) {
    return { kind: "problem", text: PROGRESS_TIMELINE_COPY.unavailable };
  }
  if (change.text === undefined) {
    await deleteMilestone(user.id, change.id);
  } else {
    const text = MILESTONE_TEXT.safeParse(change.text).data;
    if (text === undefined) {
      if (change.text.trim() === "") {
        return { kind: "problem", text: PROGRESS_TIMELINE_COPY.needsText };
      }
      return {
        kind: "problem",
        text: PROGRESS_TIMELINE_COPY.tooLong(MILESTONE_TEXT_MAX_LENGTH),
      };
    }
    if (!(await editMilestone(user.id, change.id, text))) {
      return { kind: "problem", text: PROGRESS_TIMELINE_COPY.unavailable };
    }
  }
  refresh();
  return { kind: "saved" };
}

export { changeMilestoneAction };
