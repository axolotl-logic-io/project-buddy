// Each user's event counts, one row per point (src/db/tables/events.ts).
// The stores that save what a user does gain and lose counts in the same
// transaction, so a point is there exactly while what gave it stands.
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { eventOwnedBy } from "@/accounts/owner-scope.ts";
import { type Database, getDb } from "@/db/client.ts";
import { keepRead } from "@/db/read-cache.ts";
import { events } from "@/db/tables/events.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import {
  EVENT_KIND,
  type Event,
  type Experience,
  experienceOf,
  NO_EVENTS,
} from "@/experience/experience.ts";
import { parseQuestId, type QuestId, type UserId } from "@/ids.ts";

// Who gains counts, and the quest they did it in.
interface PointGainer {
  readonly user: UserId;
  readonly questId: QuestId;
}

// Gives the user a point in the event for each source.
async function recordEvents(
  database: Database,
  { user, questId }: PointGainer,
  event: Event,
  sources: readonly string[],
): Promise<void> {
  if (sources.length === 0) {
    return;
  }
  await database
    .insert(events)
    .values(
      sources.map((source) => ({ userId: user, event, questId, source })),
    );
}

// Takes back the newest point the event gained from each source, whoever
// gained it.
async function takeBackEvents(
  database: Database,
  event: Event,
  questId: QuestId,
  sources: readonly string[],
): Promise<void> {
  if (sources.length === 0) {
    return;
  }
  const newest = database
    .selectDistinctOn([events.source], { id: events.id })
    .from(events)
    .where(
      and(
        eq(events.questId, questId),
        eq(events.event, event),
        inArray(events.source, [...sources]),
      ),
    )
    .orderBy(events.source, desc(events.gainedAt), desc(events.id));
  await database.delete(events).where(inArray(events.id, newest));
}

async function latestCheckOff(
  db: Database,
  questId: QuestId,
  taskNumber: number,
): Promise<typeof events.$inferSelect | undefined> {
  const [row] = await db
    .select()
    .from(events)
    .where(
      and(
        eq(events.questId, questId),
        eq(events.event, "checking-off"),
        eq(events.source, String(taskNumber)),
      ),
    )
    .orderBy(desc(events.gainedAt), desc(events.id))
    .limit(1);
  return row;
}

// The user's counts in each event and where they put them. Anyone in a
// quest can take back a point gained in it (takeBackEvents), so the read is
// kept with the quests the points were gained in.
async function readExperience(user: UserId): Promise<Experience> {
  "use cache";
  return await withAppErrors("readExperience", async () => {
    const rows = await getDb()
      .select({
        event: events.event,
        questId: events.questId,
        counts: sql<number>`count(*)::int`,
      })
      .from(events)
      .where(eventOwnedBy(user))
      .groupBy(events.event, events.questId);
    const counts: Record<Event, number> = { ...NO_EVENTS };
    const gainedIn = new Set<QuestId>();
    for (const row of rows) {
      const event = EVENT_KIND.safeParse(row.event).data;
      if (event !== undefined) {
        counts[event] += row.counts;
      }
      const questId = parseQuestId(row.questId ?? "");
      if (questId !== undefined) {
        gainedIn.add(questId);
      }
    }
    keepRead(user, [...gainedIn]);
    return experienceOf(counts);
  });
}

export { latestCheckOff, readExperience, recordEvents, takeBackEvents };
