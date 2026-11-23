"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import type { QuestActionResult } from "@/components/use-quest-action.ts";
import { QUEST_ID } from "@/ids.ts";
import { SPACE_ID } from "@/spaces/space.ts";
import { DAY_GRID_COPY } from "@/ui/copy/dailies.ts";
import { dayDate } from "./dailies.ts";
import { startQuestDay, undoQuestDay } from "./quest-day-store.ts";

const DAY_REQUEST = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("start"),
    questId: QUEST_ID,
    localDate: z.string(),
    emptySpaces: z.array(SPACE_ID),
  }),
  z.object({ op: z.literal("undo"), questId: QUEST_ID }),
]);

async function changeQuestDay(request: unknown): Promise<QuestActionResult> {
  const user = await requireUser();
  const change = DAY_REQUEST.safeParse(request).data;
  if (change === undefined) {
    return { kind: "problem", text: DAY_GRID_COPY.unavailable };
  }
  if (change.op === "undo") {
    const undone = await undoQuestDay(user.id, change.questId);
    refresh();
    if (!undone) {
      return { kind: "problem", text: DAY_GRID_COPY.undoUnavailable };
    }
    return { kind: "saved", message: DAY_GRID_COPY.undone };
  }
  const started = await startQuestDay(user.id, change.questId, {
    localDate: dayDate(change.localDate, new Date()),
    emptySpaces: change.emptySpaces,
  });
  if (!started) {
    return { kind: "problem", text: DAY_GRID_COPY.unavailable };
  }
  refresh();
  return { kind: "saved", message: DAY_GRID_COPY.started };
}

export { changeQuestDay };
