// The one-off tasks of the user's Active quests, for Home's Tasks.
import { and, asc, eq, not, or, sql } from "drizzle-orm";
import {
  listItemOpenTo,
  listOpenTo,
  questOpenTo,
} from "@/accounts/owner-scope.ts";
import { getDb } from "@/db/client.ts";
import { listItems, lists } from "@/db/tables/lists.ts";
import { quests } from "@/db/tables/quests.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { parseQuestId, type QuestId, type UserId } from "@/ids.ts";
import { LIST_ID, type ListId } from "@/lists/list.ts";
import { LIST_ITEM_ID, type ListItemId } from "@/lists/list-item.ts";
import { QUEST_TODAY } from "@/lists/quest-today.ts";

// A one-off task with the list that holds it, so it can be checked off
// where it is shown.
interface OneOffTask {
  readonly id: ListItemId;
  readonly listId: ListId;
  readonly text: string;
  readonly done: boolean;
}

// An Active quest's one-off tasks, in list order.
interface TaskQuest {
  readonly quest: { readonly id: QuestId; readonly name: string };
  readonly tasks: readonly OneOffTask[];
}

// Every Active quest open to the user that has a one-off task to show,
// oldest first, with those tasks: each open one, and each checked off on
// the quest's today, so a check-off can be taken back until midnight.
function readTaskQuests(user: UserId): Promise<readonly TaskQuest[]> {
  return withAppErrors("readTaskQuests", async () => {
    const rows = await getDb()
      .select({
        questId: quests.id,
        questName: quests.name,
        id: listItems.id,
        listId: listItems.listId,
        text: listItems.text,
        done: listItems.checkedOff,
      })
      .from(listItems)
      .innerJoin(lists, eq(lists.id, listItems.listId))
      .innerJoin(quests, eq(quests.id, listItems.questId))
      .where(
        and(
          questOpenTo(user),
          listOpenTo(user),
          listItemOpenTo(user),
          eq(quests.status, "active"),
          eq(lists.type, "task"),
          eq(listItems.recurring, false),
          or(
            not(listItems.checkedOff),
            sql`${listItems.checkedOffOn} = ${QUEST_TODAY}`,
          ),
        ),
      )
      .orderBy(
        asc(quests.createdAt),
        asc(quests.id),
        lists.position,
        listItems.position,
        listItems.id,
      );
    const found = new Map<QuestId, TaskQuest>();
    for (const { questId, questName, listId, id, ...task } of rows) {
      const parsed = parseQuestId(questId);
      if (parsed !== undefined) {
        const entry = found.get(parsed) ?? {
          quest: { id: parsed, name: questName },
          tasks: [],
        };
        found.set(parsed, {
          ...entry,
          tasks: [
            ...entry.tasks,
            {
              id: LIST_ITEM_ID.parse(id),
              listId: LIST_ID.parse(listId),
              ...task,
            },
          ],
        });
      }
    }
    return [...found.values()];
  });
}

export type { OneOffTask, TaskQuest };
export { readTaskQuests };
