import { and, asc, desc, eq, exists, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import {
  listItemOpenTo,
  listOpenTo,
  questDayOwnedBy,
  questOwnedBy,
} from "@/accounts/owner-scope.ts";
import { getDb, inTransaction, type Transaction } from "@/db/client.ts";
import { listItems, lists } from "@/db/tables/lists.ts";
import { questDays } from "@/db/tables/quest-days.ts";
import { quests } from "@/db/tables/quests.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { parseQuestId, type QuestId, type UserId } from "@/ids.ts";
import { LIST_ID, type ListId } from "@/lists/list.ts";
import { LIST_ITEM_ID, type ListItemId } from "@/lists/list-item.ts";
import { LIST_ITEM_RECORD } from "@/lists/list-item-record.ts";
import {
  closePerformanceForDay,
  PERFORMANCE_ID,
  restorePerformanceForDay,
} from "@/performances/performance-store.ts";
import {
  DAY_TASK,
  type DailiesDay,
  type DailiesRecord,
  type DayTask,
  type LocalDate,
} from "./dailies.ts";

const MOST_DAYS = 400;

const DAY_UNDO = z.object({
  performance: PERFORMANCE_ID.optional(),
  removed: z.array(LIST_ITEM_RECORD),
  reset: z.array(LIST_ITEM_ID),
});
type DayUndo = z.infer<typeof DAY_UNDO>;

// A quest's recurring tasks as they are now, each with the list item and
// list that hold it, so it can be checked off where it is shown.
interface RecurringTasks {
  readonly items: readonly (DayTask & {
    readonly recurring: true;
    readonly id: ListItemId;
    readonly listId: ListId;
  })[];
}

// An Active quest's recurring tasks and its days, for a table of streaks
// across quests.
interface StreakQuest {
  readonly quest: { readonly id: QuestId; readonly name: string };
  readonly days: readonly DailiesDay[];
  readonly tasks: RecurringTasks;
}

function dayScope(owner: UserId, questId: QuestId): ReturnType<typeof and> {
  return and(eq(questDays.questId, questId), questDayOwnedBy(owner));
}

async function lockDailies(
  tx: Transaction,
  owner: UserId,
  questId: QuestId,
): Promise<boolean> {
  const [row] = await tx
    .select({ id: quests.id })
    .from(quests)
    .where(
      and(
        eq(quests.id, questId),
        questOwnedBy(owner),
        eq(quests.dailies, true),
        eq(quests.status, "active"),
      ),
    )
    .for("update");
  return row !== undefined;
}

function recentDays(
  owner: UserId,
  questId: QuestId,
  db: Transaction | ReturnType<typeof getDb>,
  limit: number,
): Promise<(typeof questDays.$inferSelect)[]> {
  return Promise.resolve(
    db
      .select()
      .from(questDays)
      .where(dayScope(owner, questId))
      .orderBy(desc(questDays.startedAt), desc(questDays.id))
      .limit(limit),
  );
}

function readQuestDays(
  owner: UserId,
  questId: QuestId,
): Promise<DailiesRecord> {
  return withAppErrors("readQuestDays", async () => {
    const rows = await recentDays(owner, questId, getDb(), MOST_DAYS);
    return {
      undoable: DAY_UNDO.safeParse(rows[0]?.undo).success,
      days: rows.toReversed().map((row) => ({
        date: row.localDate,
        startedAt: row.startedAt,
        tasks: z.array(DAY_TASK).safeParse(row.tasks).data,
      })),
    };
  });
}

function questListItems(
  tx: Transaction,
  user: UserId,
  questId: QuestId,
): Promise<(typeof listItems.$inferSelect)[]> {
  return Promise.resolve(
    tx
      .select()
      .from(listItems)
      .where(and(eq(listItems.questId, questId), listItemOpenTo(user)))
      .orderBy(listItems.position, listItems.id),
  );
}

function readRecurringTasks(
  user: UserId,
  questId: QuestId,
): Promise<RecurringTasks> {
  return withAppErrors("readRecurringTasks", async () => {
    const rows = await getDb()
      .select({
        id: listItems.id,
        listId: listItems.listId,
        number: listItems.taskNumber,
        text: listItems.text,
        done: listItems.checkedOff,
      })
      .from(listItems)
      .innerJoin(lists, eq(lists.id, listItems.listId))
      .where(
        and(
          eq(listItems.questId, questId),
          listItemOpenTo(user),
          listOpenTo(user),
          eq(listItems.recurring, true),
        ),
      )
      .orderBy(lists.position, listItems.position, listItems.id);
    return {
      items: rows.flatMap(({ id, listId, number, text, done }) => {
        if (number === null) {
          return [];
        }
        return [
          {
            id: LIST_ITEM_ID.parse(id),
            listId: LIST_ID.parse(listId),
            number,
            text,
            done,
            recurring: true as const,
          },
        ];
      }),
    };
  });
}

// Every Active Dailies quest the user owns that has recurring tasks, oldest
// first, with its recurring tasks and the days the user started. Only the
// owner starts a Dailies quest's days, so a member has no streaks there.
function readStreakQuests(user: UserId): Promise<readonly StreakQuest[]> {
  return withAppErrors("readStreakQuests", async () => {
    const rows = await getDb()
      .select({ id: quests.id, name: quests.name })
      .from(quests)
      .where(
        and(
          questOwnedBy(user),
          eq(quests.dailies, true),
          eq(quests.status, "active"),
          exists(
            getDb()
              .select({ id: listItems.id })
              .from(listItems)
              .where(
                and(
                  eq(listItems.questId, quests.id),
                  eq(listItems.recurring, true),
                ),
              ),
          ),
        ),
      )
      .orderBy(asc(quests.createdAt), asc(quests.id));
    return Promise.all(
      rows.flatMap(({ id, name }) => {
        const questId = parseQuestId(id);
        if (questId === undefined) {
          return [];
        }
        return [
          Promise.all([
            readQuestDays(user, questId),
            readRecurringTasks(user, questId),
          ]).then(([record, tasks]) => ({
            quest: { id: questId, name },
            days: record.days,
            tasks,
          })),
        ];
      }),
    );
  });
}

// Records whether a recurring task was done on a date that has ended: every
// day started on that date and ended since keeps the change. The day still
// going is the task's own check, so it is not changed here. False when the
// quest isn't the owner's Active Dailies quest or no ended day on that date
// tracked the task.
function markQuestDayTask(
  owner: UserId,
  questId: QuestId,
  change: {
    readonly localDate: LocalDate;
    readonly number: number;
    readonly done: boolean;
  },
): Promise<boolean> {
  return withAppErrors("markQuestDayTask", () =>
    inTransaction(async (tx) => {
      if (!(await lockDailies(tx, owner, questId))) {
        return false;
      }
      const { localDate, number, done } = change;
      const rows = await tx
        .select({ id: questDays.id, tasks: questDays.tasks })
        .from(questDays)
        .where(
          and(dayScope(owner, questId), eq(questDays.localDate, localDate)),
        );
      const changed = rows.flatMap((row) => {
        const tasks = z.array(DAY_TASK).safeParse(row.tasks).data;
        if (tasks?.some((task) => task.number === number) !== true) {
          return [];
        }
        return [
          {
            id: row.id,
            tasks: tasks.map((task) => {
              if (task.number !== number) {
                return task;
              }
              return { ...task, done };
            }),
          },
        ];
      });
      await Promise.all(
        changed.map(({ id, tasks }) =>
          tx
            .update(questDays)
            .set({ tasks })
            .where(and(eq(questDays.id, id), dayScope(owner, questId))),
        ),
      );
      return changed.length > 0;
    }),
  );
}

async function bumpLists(
  tx: Transaction,
  user: UserId,
  ids: readonly string[],
): Promise<void> {
  if (ids.length > 0) {
    await tx
      .update(lists)
      .set({ version: sql`${lists.version} + 1` })
      .where(and(inArray(lists.id, [...ids]), listOpenTo(user)));
  }
}

function startQuestDay(
  owner: UserId,
  questId: QuestId,
  options: {
    readonly localDate: LocalDate;
    readonly emptyLists: readonly ListId[];
  },
): Promise<boolean> {
  return withAppErrors("startQuestDay", () =>
    inTransaction(async (tx) => {
      if (!(await lockDailies(tx, owner, questId))) {
        return false;
      }
      const { localDate, emptyLists } = options;
      if (emptyLists.length > 0) {
        const selected = await tx
          .select({ id: lists.id })
          .from(lists)
          .where(
            and(
              eq(lists.questId, questId),
              inArray(lists.id, [...emptyLists]),
              listOpenTo(owner),
            ),
          );
        if (selected.length !== new Set(emptyLists).size) {
          return false;
        }
      }
      const rows = await questListItems(tx, owner, questId);
      const removedLists = new Set<string>(emptyLists);
      const removed = rows.filter(({ listId }) => removedLists.has(listId));
      const reset = rows.filter(
        (row) =>
          !removedLists.has(row.listId) && row.recurring && row.checkedOff,
      );
      const previousDay = tx
        .select({ id: questDays.id })
        .from(questDays)
        .where(dayScope(owner, questId))
        .orderBy(desc(questDays.startedAt), desc(questDays.id))
        .limit(1);
      const tasks = rows.flatMap((row) => {
        if (!row.recurring || row.taskNumber === null) {
          return [];
        }
        return [
          { number: row.taskNumber, text: row.text, done: row.checkedOff },
        ];
      });
      await tx
        .update(questDays)
        .set({ tasks, undo: null })
        .where(and(eq(questDays.id, previousDay), dayScope(owner, questId)));
      if (removed.length > 0) {
        await tx.delete(listItems).where(
          and(
            inArray(
              listItems.id,
              removed.map(({ id }) => id),
            ),
            listItemOpenTo(owner),
          ),
        );
      }
      if (reset.length > 0) {
        await tx
          .update(listItems)
          .set({ checkedOff: false })
          .where(
            and(
              inArray(
                listItems.id,
                reset.map(({ id }) => id),
              ),
              listItemOpenTo(owner),
            ),
          );
      }
      await bumpLists(tx, owner, [
        ...removedLists,
        ...reset.map(({ listId }) => listId),
      ]);
      const performance = await closePerformanceForDay(tx, owner, questId);
      const undo = DAY_UNDO.parse({
        removed,
        performance,
        reset: reset.map(({ id }) => id),
      });
      await tx
        .insert(questDays)
        .values({ questId, localDate, startedAt: new Date(), undo });
      return true;
    }),
  );
}

async function restoreListItems(
  tx: Transaction,
  owner: UserId,
  questId: QuestId,
  undo: DayUndo,
): Promise<void> {
  const current = await questListItems(tx, owner, questId);
  const changed = new Set<string>();
  const reset = new Set<string>(undo.reset);
  const recurring = current.filter(
    (row) => reset.has(row.id) && row.recurring && !row.checkedOff,
  );
  if (recurring.length > 0) {
    await tx
      .update(listItems)
      .set({ checkedOff: true })
      .where(
        and(
          inArray(
            listItems.id,
            recurring.map(({ id }) => id),
          ),
          listItemOpenTo(owner),
        ),
      );
    for (const { listId } of recurring) {
      changed.add(listId);
    }
  }
  const listsToRestore = new Set(undo.removed.map(({ listId }) => listId));
  const restored = [...listsToRestore].flatMap((listId) => {
    const removed = undo.removed.filter((row) => row.listId === listId);
    const first = current.find((row) => row.listId === listId);
    const start = (first?.position ?? 0) - removed.length;
    changed.add(listId);
    return removed.map((row, index) => ({ ...row, position: start + index }));
  });
  if (restored.length > 0) {
    await tx.insert(listItems).values(restored).onConflictDoNothing();
  }
  await bumpLists(tx, owner, [...changed]);
}

function undoQuestDay(owner: UserId, questId: QuestId): Promise<boolean> {
  return withAppErrors("undoQuestDay", () =>
    inTransaction(async (tx) => {
      if (!(await lockDailies(tx, owner, questId))) {
        return false;
      }
      const [newest, previous] = await recentDays(owner, questId, tx, 2);
      const undo = DAY_UNDO.safeParse(newest?.undo).data;
      if (newest === undefined || undo === undefined) {
        return false;
      }
      await restoreListItems(tx, owner, questId, undo);
      if (undo.performance !== undefined) {
        await restorePerformanceForDay(tx, owner, questId, undo.performance);
      }
      await tx
        .delete(questDays)
        .where(and(eq(questDays.id, newest.id), dayScope(owner, questId)));
      if (previous !== undefined) {
        await tx
          .update(questDays)
          .set({ tasks: null })
          .where(and(eq(questDays.id, previous.id), dayScope(owner, questId)));
      }
      return true;
    }),
  );
}

export type { RecurringTasks, StreakQuest };
export {
  markQuestDayTask,
  readQuestDays,
  readRecurringTasks,
  readStreakQuests,
  startQuestDay,
  undoQuestDay,
};
