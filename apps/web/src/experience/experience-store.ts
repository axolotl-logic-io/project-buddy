// Each user's event counts, one row per point (src/db/tables/events.ts).
// The stores that save what a user does gain and lose counts in the same
// transaction, so a point is there exactly while what gave it stands.
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { type Database, getDb } from "@/db/client.ts";
import { events } from "@/db/tables/events.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import {
  EVENT_KIND,
  type Event,
  type Experience,
  experienceOf,
  NO_EVENTS,
} from "@/experience/experience.ts";
import { taskPointChanges } from "@/experience/task-points.ts";
import type { QuestId, UserId } from "@/ids.ts";
import type { Tasks } from "@/tasks/tasks.ts";

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

// The counts a change to the quest's Tasks gains the user, or takes back
// for each task it reopened.
async function changeTaskPoints(
  database: Database,
  gainer: PointGainer,
  before: Tasks,
  after: Tasks,
): Promise<void> {
  const { added, completed, reopened } = taskPointChanges(before, after);
  await recordEvents(database, gainer, "adding", added.map(String));
  await recordEvents(database, gainer, "checking-off", completed.map(String));
  await takeBackEvents(
    database,
    "checking-off",
    gainer.questId,
    reopened.map(String),
  );
}

// The user's counts in each event and where they put them.
function readExperience(user: UserId): Promise<Experience> {
  return withAppErrors("readExperience", async () => {
    const rows = await getDb()
      .select({
        event: events.event,
        counts: sql<number>`count(*)::int`,
      })
      .from(events)
      .where(eq(events.userId, user))
      .groupBy(events.event);
    const counts: Record<Event, number> = { ...NO_EVENTS };
    for (const row of rows) {
      const event = EVENT_KIND.safeParse(row.event).data;
      if (event !== undefined) {
        counts[event] = row.counts;
      }
    }
    return experienceOf(counts);
  });
}

export type { PointGainer };
export { changeTaskPoints, readExperience, recordEvents, takeBackEvents };
