import { and, desc, eq, inArray, sql } from "drizzle-orm";
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
import type { QuestId, UserId } from "@/ids.ts";
import type { ListId } from "@/lists/list.ts";
import { LIST_ITEM_ID } from "@/lists/list-item.ts";
import { LIST_ITEM_RECORD } from "@/lists/list-item-record.ts";
import {
  closePerformanceForDay,
  PERFORMANCE_ID,
  restorePerformanceForDay,
} from "@/performances/performance-store.ts";
import {
  DAY_TASK,
  type DailiesRecord,
  type DayTasks,
  type LocalDate,
} from "./dailies.ts";

const MOST_DAYS = 400;

const DAY_UNDO = z.object({
  performance: PERFORMANCE_ID.optional(),
  removed: z.array(LIST_ITEM_RECORD),
  reset: z.array(LIST_ITEM_ID),
});
type DayUndo = z.infer<typeof DAY_UNDO>;

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

function readRecurringTasks(user: UserId, questId: QuestId): Promise<DayTasks> {
  return withAppErrors("readRecurringTasks", async () => {
    const rows = await getDb()
      .select({
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
      items: rows.flatMap(({ number, text, done }) => {
        if (number === null) {
          return [];
        }
        return [{ number, text, done, recurring: true }];
      }),
    };
  });
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

export { readQuestDays, readRecurringTasks, startQuestDay, undoQuestDay };
