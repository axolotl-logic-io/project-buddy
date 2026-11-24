// The check-off history and recurring tasks of a quest, for its streaks and
// Day grid (src/streaks/streaks.ts).
import { and, asc, eq, exists, gte, sql } from "drizzle-orm";
import {
  checkOffInQuestOpenTo,
  listItemOpenTo,
  listOpenTo,
  questOpenTo,
} from "@/accounts/owner-scope.ts";
import { getDb, inTransaction } from "@/db/client.ts";
import { events } from "@/db/tables/events.ts";
import { listItems, lists } from "@/db/tables/lists.ts";
import { quests } from "@/db/tables/quests.ts";
import { users } from "@/db/tables/users.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { parseQuestId, type QuestId, type UserId } from "@/ids.ts";
import { LIST_ID, type ListId } from "@/lists/list.ts";
import { LIST_ITEM_ID, type ListItemId } from "@/lists/list-item.ts";
import { CHECKED_OFF_NOW } from "@/lists/quest-today.ts";
import {
  addDays,
  HISTORY_DAYS,
  type LocalDate,
  localDate,
  STREAK_TABLE_DAYS,
  type TaskHistory,
  type TrackedTask,
} from "./streaks.ts";

// A recurring task with the list item and list that hold it, so it can be
// checked off where it is shown.
interface RecurringTask extends TrackedTask {
  readonly id: ListItemId;
  readonly listId: ListId;
}

// An Active quest's recurring tasks and its check-off history, for Home's
// table of streaks across quests.
interface StreakQuest {
  readonly quest: { readonly id: QuestId; readonly name: string };
  readonly history: TaskHistory;
  readonly tasks: readonly RecurringTask[];
}

// The quest's check-off history, in its owner's time zone, or undefined
// when the quest isn't open to user.
function readTaskHistory(
  user: UserId,
  questId: QuestId,
): Promise<TaskHistory | undefined> {
  return withAppErrors("readTaskHistory", async () => {
    const db = getDb();
    const [quest] = await db
      .select({
        timeZone: users.timeZone,
        today: sql<string>`(now() at time zone ${users.timeZone})::date::text`,
      })
      .from(quests)
      .innerJoin(users, eq(users.id, quests.userId))
      .where(and(eq(quests.id, questId), questOpenTo(user)));
    if (quest === undefined) {
      return;
    }
    const rows = await db
      .selectDistinct({
        source: events.source,
        date: sql<string>`(${events.gainedAt} at time zone ${quest.timeZone})::date::text`,
      })
      .from(events)
      .where(
        and(
          eq(events.questId, questId),
          checkOffInQuestOpenTo(user),
          gte(
            events.gainedAt,
            sql`now() - make_interval(days => ${HISTORY_DAYS + 1})`,
          ),
        ),
      );
    const dates = new Map<number, string[]>();
    for (const { source, date } of rows) {
      const number = Number(source);
      if (Number.isInteger(number)) {
        dates.set(number, [...(dates.get(number) ?? []), date]);
      }
    }
    return {
      today: quest.today,
      timeZone: quest.timeZone,
      checkOffs: [...dates].map(([number, each]) => ({
        number,
        dates: each.toSorted(),
      })),
    };
  });
}

// The quest's recurring tasks, in list order, across its task lists.
function readRecurringTasks(
  user: UserId,
  questId: QuestId,
): Promise<RecurringTask[]> {
  return withAppErrors("readRecurringTasks", async () => {
    const rows = await getDb()
      .select({
        id: listItems.id,
        listId: listItems.listId,
        number: listItems.taskNumber,
        text: listItems.text,
        done: CHECKED_OFF_NOW.mapWith(Boolean),
        createdAt: listItems.createdAt,
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
    return rows.flatMap(({ id, listId, number, ...task }) => {
      if (number === null) {
        return [];
      }
      return [
        {
          id: LIST_ITEM_ID.parse(id),
          listId: LIST_ID.parse(listId),
          number,
          ...task,
        },
      ];
    });
  });
}

// Every Active quest open to the user that has a recurring task, oldest
// first, with its recurring tasks and check-off history.
function readStreakQuests(user: UserId): Promise<readonly StreakQuest[]> {
  return withAppErrors("readStreakQuests", async () => {
    const db = getDb();
    const rows = await db
      .select({ id: quests.id, name: quests.name })
      .from(quests)
      .where(
        and(
          questOpenTo(user),
          eq(quests.status, "active"),
          exists(
            db
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
    const found = await Promise.all(
      rows.map(async ({ id, name }) => {
        const questId = parseQuestId(id);
        if (questId === undefined) {
          return [];
        }
        const [history, tasks] = await Promise.all([
          readTaskHistory(user, questId),
          readRecurringTasks(user, questId),
        ]);
        if (history === undefined) {
          return [];
        }
        return [{ quest: { id: questId, name }, history, tasks }];
      }),
    );
    return found.flat();
  });
}

// Whether someone checked off a recurring task on an earlier date, as Home
// changes it: checking it off adds a check-off for that day, earning its
// experience, and unchecking it takes back every check-off that day. Today
// is the task's own check, so it is not changed here. False when the quest
// isn't open to the user and Active, it has no such recurring task, or the
// date is outside the table's earlier dates or before the task was added.
function markTaskDay(
  user: UserId,
  questId: QuestId,
  change: {
    readonly localDate: LocalDate;
    readonly number: number;
    readonly done: boolean;
  },
): Promise<boolean> {
  return withAppErrors("markTaskDay", () =>
    inTransaction(async (tx) => {
      const [task] = await tx
        .select({
          createdAt: listItems.createdAt,
          timeZone: users.timeZone,
          today: sql<string>`(now() at time zone ${users.timeZone})::date::text`,
        })
        .from(listItems)
        .innerJoin(quests, eq(quests.id, listItems.questId))
        .innerJoin(users, eq(users.id, quests.userId))
        .where(
          and(
            eq(listItems.questId, questId),
            eq(listItems.taskNumber, change.number),
            eq(listItems.recurring, true),
            listItemOpenTo(user),
            questOpenTo(user),
            eq(quests.status, "active"),
          ),
        )
        .for("update", { of: listItems });
      const date = change.localDate;
      if (
        task === undefined ||
        date >= task.today ||
        date < addDays(task.today, 1 - STREAK_TABLE_DAYS) ||
        date < localDate(task.createdAt, task.timeZone)
      ) {
        return false;
      }
      const thatDay = and(
        eq(events.questId, questId),
        eq(events.event, "checking-off"),
        eq(events.source, String(change.number)),
        sql`(${events.gainedAt} at time zone ${task.timeZone})::date = ${date}::date`,
      );
      if (!change.done) {
        await tx.delete(events).where(thatDay);
        return true;
      }
      const [already] = await tx
        .select({ id: events.id })
        .from(events)
        .where(thatDay)
        .limit(1);
      if (already === undefined) {
        // Noon that day, well inside it in the owner's time zone.
        await tx.insert(events).values({
          userId: user,
          event: "checking-off",
          questId,
          source: String(change.number),
          gainedAt: sql`(${date}::date + time '12:00') at time zone ${task.timeZone}`,
        });
      }
      return true;
    }),
  );
}

export type { RecurringTask, StreakQuest };
export { markTaskDay, readRecurringTasks, readStreakQuests, readTaskHistory };
