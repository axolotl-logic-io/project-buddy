// The check-off history and recurring tasks of a quest, for its streaks and
// Day grid (src/streaks/streaks.ts).
import { and, eq, gte, sql } from "drizzle-orm";
import {
  checkOffInQuestOpenTo,
  listItemOpenTo,
  listOpenTo,
  questOpenTo,
} from "@/accounts/owner-scope.ts";
import { getDb } from "@/db/client.ts";
import { events } from "@/db/tables/events.ts";
import { listItems, lists } from "@/db/tables/lists.ts";
import { quests } from "@/db/tables/quests.ts";
import { users } from "@/db/tables/users.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import type { QuestId, UserId } from "@/ids.ts";
import { CHECKED_OFF_NOW } from "@/lists/quest-today.ts";
import { HISTORY_DAYS, type TaskHistory, type TrackedTask } from "./streaks.ts";

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
): Promise<TrackedTask[]> {
  return withAppErrors("readRecurringTasks", async () => {
    const rows = await getDb()
      .select({
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
    return rows.flatMap(({ number, ...task }) => {
      if (number === null) {
        return [];
      }
      return [{ number, ...task }];
    });
  });
}

export { readRecurringTasks, readTaskHistory };
