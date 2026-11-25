// Finding tasks by their text, for Quests' search: the tasks of the
// user's Active quests, in their task lists, so each can be checked off
// where it is found.
import { and, asc, eq, sql } from "drizzle-orm";
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
import { CHECKED_OFF_NOW, QUEST_TODAY } from "@/lists/quest-today.ts";
import { SHARING_COLUMNS, sharingOf } from "@/quests/quest-sharing.ts";
import { readTaskHistory } from "@/streaks/streak-store.ts";
import { type Cadence, streakChains } from "@/streaks/streaks.ts";

// The most tasks one search finds.
const MAX_FOUND_TASKS = 200;

// The characters a LIKE pattern gives a meaning, escaped to match
// themselves.
const LIKE_SPECIAL = /[\\%_]/gu;

// A task whose text holds the search, with its quest.
interface FoundTask {
  readonly id: ListItemId;
  readonly listId: ListId;
  readonly text: string;
  readonly quest: {
    readonly id: QuestId;
    readonly name: string;
    // Whether anyone but its owner is in it.
    readonly shared: boolean;
  };
  // Checked off now: a one-off task once checked off, a recurring one in
  // its day, week or month.
  readonly done: boolean;
  // A one-off task checked off before today.
  readonly earlier: boolean;
  // How often a recurring task repeats, and its run of periods done; a
  // one-off task has none.
  readonly repeats: Repeats | undefined;
}

interface Repeats {
  readonly cadence: Cadence;
  readonly streak: number;
}

// The streak of each found recurring task, read once for each quest.
async function withStreaks(
  user: UserId,
  found: readonly (Omit<FoundTask, "repeats"> & {
    readonly number: number | null;
    readonly createdAt: Date;
    readonly recurring: boolean;
    readonly cadence: Cadence;
  })[],
): Promise<FoundTask[]> {
  const questIds = new Set(
    found.filter(({ recurring }) => recurring).map(({ quest }) => quest.id),
  );
  const histories = new Map(
    await Promise.all(
      [...questIds].map(
        async (id) => [id, await readTaskHistory(user, id)] as const,
      ),
    ),
  );
  return found.map(({ number, createdAt, recurring, cadence, ...task }) => {
    const history = histories.get(task.quest.id);
    if (!recurring || number === null || history === undefined) {
      return { ...task, repeats: undefined };
    }
    const chain = streakChains(history, [
      { ...task, number, createdAt, cadence },
    ]);
    return {
      ...task,
      repeats: { cadence, streak: chain.get(number)?.streak ?? 0 },
    };
  });
}

// The tasks of the user's Active quests whose text holds the search,
// ignoring case: open ones first, then those done today, then those
// checked off earlier.
function searchTasks(
  user: UserId,
  search: string,
): Promise<readonly FoundTask[]> {
  return withAppErrors("searchTasks", async () => {
    const pattern = `%${search.replaceAll(LIKE_SPECIAL, "\\$&")}%`;
    const earlier = sql<boolean>`(${listItems.checkedOff} and not ${listItems.recurring} and ${listItems.checkedOffOn} is distinct from ${QUEST_TODAY})`;
    const rows = await getDb()
      .select({
        id: listItems.id,
        listId: listItems.listId,
        text: listItems.text,
        number: listItems.taskNumber,
        createdAt: listItems.createdAt,
        recurring: listItems.recurring,
        cadence: listItems.cadence,
        done: CHECKED_OFF_NOW.mapWith(Boolean),
        earlier: earlier.mapWith(Boolean),
        questId: quests.id,
        questName: quests.name,
        ...SHARING_COLUMNS,
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
          sql`${listItems.text} ilike ${pattern}`,
        ),
      )
      .orderBy(
        asc(earlier),
        asc(CHECKED_OFF_NOW),
        asc(quests.createdAt),
        asc(quests.id),
        asc(lists.position),
        asc(listItems.position),
        asc(listItems.id),
      )
      .limit(MAX_FOUND_TASKS);
    return withStreaks(
      user,
      rows.flatMap(({ questId, questName, id, listId, ...row }) => {
        const parsed = parseQuestId(questId);
        if (parsed === undefined) {
          return [];
        }
        return [
          {
            id: LIST_ITEM_ID.parse(id),
            listId: LIST_ID.parse(listId),
            text: row.text,
            number: row.number,
            createdAt: row.createdAt,
            recurring: row.recurring,
            cadence: row.cadence,
            done: row.done,
            earlier: row.earlier,
            quest: {
              id: parsed,
              name: questName,
              shared: sharingOf(user, row).kind !== "private",
            },
          },
        ];
      }),
    );
  });
}

export type { FoundTask, Repeats };
export { searchTasks };
