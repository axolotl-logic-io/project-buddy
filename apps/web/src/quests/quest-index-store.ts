// What Quests shows of each quest open to the user: the quest, when
// something last happened in it, how many tasks it has open and the rite
// running in it, if any; and the user's Life, with how many of its
// recurring tasks are done today and one not done yet, picked at random.
import { and, desc, eq, isNull, not, sql } from "drizzle-orm";
import {
  eventOwnedBy,
  listItemOpenTo,
  listOpenTo,
  performanceMessageOpenTo,
  performanceOpenTo,
  questOpenTo,
  questOwnedBy,
} from "@/accounts/owner-scope.ts";
import { getDb } from "@/db/client.ts";
import { events } from "@/db/tables/events.ts";
import { listItems, lists } from "@/db/tables/lists.ts";
import { performanceMessages, performances } from "@/db/tables/performances.ts";
import { quests } from "@/db/tables/quests.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { parseQuestId, type QuestId, type UserId } from "@/ids.ts";
import type { ListId } from "@/lists/list.ts";
import type { ListItemId } from "@/lists/list-item.ts";
import { CHECKED_OFF_NOW } from "@/lists/quest-today.ts";
import { SHARING_COLUMNS } from "@/quests/quest-sharing.ts";
import { QUEST_COLUMNS, type Quest, toQuests } from "@/quests/store.ts";
import { readRecurringTasks, readTaskHistory } from "@/streaks/streak-store.ts";
import { streakChains } from "@/streaks/streaks.ts";

// One quest as Quests lists it.
interface QuestEntry {
  readonly quest: Quest;
  // The newest of: the quest's start, a task added, a message in one of
  // its rites, and the user's own check-off or completion in it.
  readonly lastActive: Date;
  // Its tasks not checked off now, in its task lists.
  readonly openTasks: number;
  // The name of the rite running in it, if one is.
  readonly runningRite: string | undefined;
}

// A recurring task of Life's not done today, offered on Quests.
interface SuggestedTask {
  readonly id: ListItemId;
  readonly listId: ListId;
  readonly text: string;
  // Its run of days done, up to yesterday.
  readonly streak: number;
}

// The user's Life, as Quests pins it.
interface LifeSummary {
  readonly quest: { readonly id: QuestId; readonly name: string };
  readonly recurring: number;
  readonly doneToday: number;
  // Its recurring tasks not done today.
  readonly waiting: readonly SuggestedTask[];
  // One of them, picked at random.
  readonly suggestion: SuggestedTask | undefined;
}

// The outer quest of a correlated subquery, written in full so the
// subquery refers to it.
const OUTER_QUEST = sql.raw(`"quests"."id"`);

// Every quest open to the user, newest activity first.
function readQuestEntries(user: UserId): Promise<readonly QuestEntry[]> {
  return withAppErrors("readQuestEntries", async () => {
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
          runningRite: row.runningRite ?? undefined,
        },
      ];
    });
  });
}

// The user's own Life, or undefined before it is made.
function readLife(user: UserId): Promise<LifeSummary | undefined> {
  return withAppErrors("readLife", async () => {
    const [found] = await getDb()
      .select({ id: quests.id, name: quests.name })
      .from(quests)
      .where(and(questOwnedBy(user), eq(quests.life, true)));
    const id = parseQuestId(found?.id ?? "");
    if (found === undefined || id === undefined) {
      return;
    }
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
      doneToday: tasks.length - notDone.length,
      waiting,
      suggestion,
    };
  });
}

export type { LifeSummary, QuestEntry, SuggestedTask };
export { readLife, readQuestEntries };
