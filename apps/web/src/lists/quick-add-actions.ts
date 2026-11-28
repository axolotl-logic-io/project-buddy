"use server";

import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { QUEST_ID } from "@/ids.ts";
import { checkQuickAddText, type QuickAddTarget } from "@/lists/quick-add.ts";
import { listQuests } from "@/quests/store.ts";
import { QUICK_ADD_COPY } from "@/ui/copy/quick-add.ts";
import { LIST_ID } from "./list.ts";
import { quickAdd } from "./list-item-store.ts";
import { readLists } from "./list-store.ts";

interface QuickAddQuest extends QuickAddTarget {
  readonly lists: readonly { readonly id: string; readonly name: string }[];
}

type QuickAddResult =
  | { readonly kind: "saved" }
  | {
      readonly kind: "problem";
      readonly text:
        | typeof QUICK_ADD_COPY.chooseList
        | typeof QUICK_ADD_COPY.listUnavailable
        | typeof QUICK_ADD_COPY.tooLongForList
        | ReturnType<typeof QUICK_ADD_COPY.problem>;
    };

const REQUEST = z.object({
  questId: QUEST_ID,
  listId: LIST_ID,
  text: z.string(),
});

async function listQuickAddQuests(): Promise<QuickAddQuest[]> {
  const user = await requireUser();
  const quests = await listQuests(user.id);
  return Promise.all(
    quests
      .filter(({ status }) => status === "active")
      .map(async ({ id, name, sharing }) => {
        const lists = await readLists(user.id, id);
        return {
          id,
          name,
          sharing,
          // A Zotero Collection list takes no list items.
          lists: lists
            .filter(({ type }) => type !== "zotero-collection")
            .map(({ id: listId, name: listName }) => ({
              id: listId,
              name: listName,
            })),
        };
      }),
  );
}

async function saveQuickAdd(request: unknown): Promise<QuickAddResult> {
  const user = await requireUser();
  const input = REQUEST.safeParse(request).data;
  if (input === undefined) {
    return { kind: "problem", text: QUICK_ADD_COPY.chooseList };
  }
  const checked = checkQuickAddText(input.text);
  if ("problem" in checked) {
    return { kind: "problem", text: QUICK_ADD_COPY.problem(checked.problem) };
  }
  const { questId, listId } = input;
  const result = await quickAdd(user.id, { questId, listId }, checked.text);
  if (result === "invalid-text") {
    return { kind: "problem", text: QUICK_ADD_COPY.tooLongForList };
  }
  if (result !== "saved") {
    return { kind: "problem", text: QUICK_ADD_COPY.listUnavailable };
  }
  return { kind: "saved" };
}

export type { QuickAddQuest };
export { listQuickAddQuests, saveQuickAdd };
