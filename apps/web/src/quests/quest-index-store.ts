// What Quests shows of each quest open to the user: the quest, when
// something last happened in it, how many tasks it has open, how many were
// checked off this week and the rite running in it, if any; and the user's Life, with how many of its
// recurring tasks are done today and one not done yet, picked at random
// each time the read is kept again (src/db/read-cache.ts).
import { and, desc, eq, isNull, not, sql } from "drizzle-orm";
import { z } from "zod";
import {
  checkOffInQuestOpenTo,
  eventOwnedBy,
  listItemOpenTo,
  listOpenTo,
  performanceMessageOpenTo,
  performanceOpenTo,
  questOpenTo,
  questOwnedBy,
} from "@/accounts/owner-scope.ts";
import { getDb } from "@/db/client.ts";
import { keepRead } from "@/db/read-cache.ts";
import { events } from "@/db/tables/events.ts";
import { listItems, lists } from "@/db/tables/lists.ts";
import { performanceMessages, performances } from "@/db/tables/performances.ts";
import { quests } from "@/db/tables/quests.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { parseQuestId, type QuestId, type UserId } from "@/ids.ts";
import type { ListId } from "@/lists/list.ts";
import type { ListItemId } from "@/lists/list-item.ts";
import { CHECKED_OFF_NOW } from "@/lists/quest-today.ts";
import {
  keepQuestReadToday,
  keepQuestsReadToday,
} from "@/quests/quest-reads.ts";
import { SHARING_COLUMNS } from "@/quests/quest-sharing.ts";
import { QUEST_COLUMNS, type Quest, toQuests } from "@/quests/store.ts";
import { readRecurringTasks, readTaskHistory } from "@/streaks/streak-store.ts";
import { type Cadence, streakChains } from "@/streaks/streaks.ts";

// One quest as Quests lists it.
interface QuestEntry {
  readonly quest: Quest;
  // The newest of: the quest's start, a task added, a message in one of
  // its rites, and the user's own check-off or completion in it.
  readonly lastActive: Date;
  // Its tasks not checked off now, in its task lists.
  readonly openTasks: number;
  // Its check-offs in the owner's week, from Monday, by anyone in it: each
  // task once a day, so a daily task counts each day it was done. A
  // check-off taken back is not counted.
  readonly doneThisWeek: number;
  // The name of the rite running in it, if one is.
  readonly runningRite: string | undefined;
}

// A recurring task of Life's not done in its day, week or month yet,
// offered on Quests.
interface SuggestedTask {
  readonly id: ListItemId;
  readonly listId: ListId;
  readonly text: string;
  readonly cadence: Cadence;
  // Its run of days, weeks or months done, by its cadence.
  readonly streak: number;
}

// The user's Life, as Quests pins it.
interface LifeSummary {
  readonly quest: { readonly id: QuestId; readonly name: string };
  readonly recurring: number;
  readonly doneNow: number;
  // Its recurring tasks not done in their day, week or month yet.
  readonly waiting: readonly SuggestedTask[];
  // One of them, picked at random.
  readonly suggestion: SuggestedTask | undefined;
}

// The outer quest of a correlated subquery, written in full so the
// subquery refers to it.
const OUTER_QUEST = sql.raw(`"quests"."id"`);

// The time zone of the outer quest's owner, whose days, from midnight, and
// weeks, from Monday, every member's count shares.
const OUTER_QUEST_ZONE = sql.raw(
  `(select "owner"."time_zone" from "users" as "owner" where "owner"."id" = "quests"."user_id")`,
);

// How long the time Quests' words count to is kept, in seconds: they count
// whole minutes at the finest.
const COUNTED_TO_SECONDS = 60;

// The database's answer to what time it is.
const DATABASE_TIME = z.object({
  rows: z.tuple([z.object({ now: z.coerce.date() })]),
});

// Every quest open to the user, newest activity first.
async function readQuestEntries(user: UserId): Promise<readonly QuestEntry[]> {
  "use cache";
  await keepQuestsReadToday(user);
  return await withAppErrors("readQuestEntries", async () => {
    const db = getDb();
    const taskAdded = db
      .select({ time: sql`max(${listItems.createdAt})` })
      .from(listItems)
      .where(
        and(sql`${listItems.questId} = ${OUTER_QUEST}`, listItemOpenTo(user)),
      );
    const message = db
      .select({ time: sql`max(${performanceMessages.createdAt})` })
      .from(performanceMessages)
      .innerJoin(
        performances,
        eq(performances.id, performanceMessages.performanceId),
      )
      .where(
        and(
          sql`${performances.questId} = ${OUTER_QUEST}`,
          performanceOpenTo(user),
          performanceMessageOpenTo(user),
        ),
      );
    const event = db
      .select({ time: sql`max(${events.gainedAt})` })
      .from(events)
      .where(and(sql`${events.questId} = ${OUTER_QUEST}`, eventOwnedBy(user)));
    const open = db
      .select({ count: sql`count(*)` })
      .from(listItems)
      .innerJoin(lists, eq(lists.id, listItems.listId))
      .where(
        and(
          sql`${listItems.questId} = ${OUTER_QUEST}`,
          listItemOpenTo(user),
          listOpenTo(user),
          eq(lists.type, "task"),
          not(CHECKED_OFF_NOW),
        ),
      );
    const checkedOffOn = sql`(${events.gainedAt} at time zone ${OUTER_QUEST_ZONE})`;
    const doneThisWeek = db
      .select({
        count: sql`count(distinct (${events.source}, ${checkedOffOn}::date))`,
      })
      .from(events)
      .where(
        and(
          sql`${events.questId} = ${OUTER_QUEST}`,
          checkOffInQuestOpenTo(user),
          sql`date_trunc('week', ${checkedOffOn}) = date_trunc('week', now() at time zone ${OUTER_QUEST_ZONE})`,
        ),
      );
    const running = db
      .select({ name: sql`${performances.riteSnapshot} ->> 'name'` })
      .from(performances)
      .where(
        and(
          sql`${performances.questId} = ${OUTER_QUEST}`,
          performanceOpenTo(user),
          isNull(performances.endedAt),
        ),
      )
      .limit(1);
    const lastActive = sql`greatest(${quests.createdAt}, (${taskAdded}), (${message}), (${event}))`;
    const rows = await db
      .select({
        ...QUEST_COLUMNS,
        ...SHARING_COLUMNS,
        lastActive: lastActive.mapWith(quests.createdAt),
        openTasks: sql`(${open})`.mapWith(Number),
        doneThisWeek: sql`(${doneThisWeek})`.mapWith(Number),
        runningRite: sql<string | null>`(${running})`,
      })
      .from(quests)
      .where(questOpenTo(user))
      .orderBy(desc(lastActive), desc(quests.id));
    const read = toQuests(user, rows);
    return rows.flatMap((row) => {
      const quest = read.find(({ id }) => id === row.id);
      if (quest === undefined) {
        return [];
      }
      return [
        {
          quest,
          lastActive: row.lastActive,
          openTasks: row.openTasks,
          doneThisWeek: row.doneThisWeek,
          runningRite: row.runningRite ?? undefined,
        },
      ];
    });
  });
}

// The time the user's Quests counts its words to, by the database's
// clock, which its times are written by. It is kept for a minute, or until
// the user's next change, so Quests is rendered ahead of the request, as
// part of the session's App Shell.
async function readFinderTime(user: UserId): Promise<Date> {
  "use cache";
  keepRead(user, [], COUNTED_TO_SECONDS);
  const result = await withAppErrors("readFinderTime", () =>
    getDb().execute(sql`select now() as "now"`),
  );
  const [{ now }] = DATABASE_TIME.parse(result).rows;
  return now;
}

// The user's own Life, or undefined before it is made.
async function readLife(user: UserId): Promise<LifeSummary | undefined> {
  "use cache";
  return await withAppErrors("readLife", async () => {
    const [found] = await getDb()
      .select({ id: quests.id, name: quests.name })
      .from(quests)
      .where(and(questOwnedBy(user), eq(quests.life, true)));
    const id = parseQuestId(found?.id ?? "");
    if (found === undefined || id === undefined) {
      keepRead(user, []);
      return;
    }
    await keepQuestReadToday(user, id);
    const tasks = await readRecurringTasks(user, id);
    const notDone = tasks.filter(({ done }) => !done);
    let waiting: SuggestedTask[] = [];
    if (notDone.length > 0) {
      const history = await readTaskHistory(user, id);
      let chains: ReadonlyMap<number, { readonly streak: number }> = new Map();
      if (history !== undefined) {
        chains = streakChains(history, notDone);
      }
      waiting = notDone.map((task) => ({
        id: task.id,
        listId: task.listId,
        text: task.text,
        cadence: task.cadence,
        streak: chains.get(task.number)?.streak ?? 0,
      }));
    }
    let suggestion: SuggestedTask | undefined;
    if (waiting.length > 0) {
      suggestion = waiting[Math.floor(Math.random() * waiting.length)];
    }
    return {
      quest: { id, name: found.name },
      recurring: tasks.length,
      doneNow: tasks.length - notDone.length,
      waiting,
      suggestion,
    };
  });
}

export type { LifeSummary, QuestEntry, SuggestedTask };
export { readFinderTime, readLife, readQuestEntries };
