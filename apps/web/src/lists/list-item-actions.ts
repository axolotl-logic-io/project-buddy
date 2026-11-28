"use server";

import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import type { QuestActionResult } from "@/components/use-quest-action.ts";
import { AppError } from "@/errors/app-error.ts";
import { QUEST_ID } from "@/ids.ts";
import { LISTS_COPY } from "@/ui/copy/lists.ts";
import { LIST_ID } from "./list.ts";
import { LIST_ITEM_CHANGE } from "./list-item.ts";
import { writeListContents } from "./list-item-store.ts";

const REQUEST = z.object({
  questId: QUEST_ID,
  listId: LIST_ID,
  change: LIST_ITEM_CHANGE,
});

async function changeListItemAction(
  request: unknown,
): Promise<QuestActionResult> {
  const user = await requireUser();
  const input = REQUEST.safeParse(request);
  if (!input.success) {
    return { kind: "problem", text: LISTS_COPY.invalidChange };
  }
  try {
    const { questId, listId, change } = input.data;
    const { result, list } = await writeListContents(
      user.id,
      questId,
      listId,
      change,
    );
    if (result === "saved") {
      if (change.kind === "undo" || list === undefined) {
        return { kind: "saved" };
      }
      return { kind: "saved", undoVersion: list.version };
    }
    return { kind: "problem", text: LISTS_COPY.changeProblems[result] };
  } catch (error) {
    if (error instanceof AppError) {
      return { kind: "problem", text: error.message };
    }
    throw error;
  }
}

export { changeListItemAction };
