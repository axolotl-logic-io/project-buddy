"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import type { QuestActionResult } from "@/components/use-quest-action.ts";
import { QUEST_ID } from "@/ids.ts";
import { LIST_ITEM_ID } from "@/lists/list-item.ts";
import { TALLIES_COPY } from "@/ui/copy/tallies.ts";
import { TALLY_AMOUNT } from "./tally.ts";
import {
  incrementTally,
  setTallyDay,
  type TallyResult,
} from "./tally-store.ts";

const INCREMENT_REQUEST = z.object({
  questId: QUEST_ID,
  id: LIST_ITEM_ID,
  amount: TALLY_AMOUNT,
});

const SET_REQUEST = z.object({
  questId: QUEST_ID,
  id: LIST_ITEM_ID,
  date: z.iso.date(),
  total: TALLY_AMOUNT,
});

function answer(result: TallyResult): QuestActionResult {
  if (result === "saved") {
    return { kind: "saved", message: TALLIES_COPY.saved };
  }
  return { kind: "problem", text: TALLIES_COPY.problems[result] };
}

const INVALID: QuestActionResult = {
  kind: "problem",
  text: TALLIES_COPY.problems["invalid-amount"],
};

// Adds an amount to a tally's total on its quest's today.
async function incrementTallyAction(
  request: unknown,
): Promise<QuestActionResult> {
  const user = await requireUser();
  const change = INCREMENT_REQUEST.safeParse(request).data;
  if (change === undefined) {
    return INVALID;
  }
  const result = await incrementTally(user.id, change.questId, change);
  refresh();
  return answer(result);
}

// Sets a tally's total on one of its last seven days.
async function setTallyDayAction(request: unknown): Promise<QuestActionResult> {
  const user = await requireUser();
  const change = SET_REQUEST.safeParse(request).data;
  if (change === undefined) {
    return INVALID;
  }
  const result = await setTallyDay(user.id, change.questId, change);
  refresh();
  return answer(result);
}

export { incrementTallyAction, setTallyDayAction };
