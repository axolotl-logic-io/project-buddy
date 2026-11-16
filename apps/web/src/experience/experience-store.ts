// Each user's ability points, one row per point (src/db/tables/ability-points.ts).
// The stores that save what a user does gain and lose points in the same
// transaction, so a point is there exactly while what gave it stands.
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { type Database, getDb } from "@/db/client.ts";
import { abilityPoints } from "@/db/tables/ability-points.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import {
  ABILITY,
  type Ability,
  type Experience,
  experienceOf,
  NO_POINTS,
} from "@/experience/experience.ts";
import { taskPointChanges } from "@/experience/task-points.ts";
import type { QuestId, UserId } from "@/ids.ts";
import type { Tasks } from "@/tasks/tasks.ts";

// Who gains points, and the quest they did it in.
interface PointGainer {
  readonly user: UserId;
  readonly questId: QuestId;
}

// Gives the user a point in the ability for each source.
async function gainPoints(
  database: Database,
  { user, questId }: PointGainer,
  ability: Ability,
  sources: readonly string[],
): Promise<void> {
  if (sources.length === 0) {
    return;
  }
  await database
    .insert(abilityPoints)
    .values(
      sources.map((source) => ({ userId: user, ability, questId, source })),
    );
}

// Takes back the newest point the ability gained from each source, whoever
// gained it.
async function losePoints(
  database: Database,
  ability: Ability,
  questId: QuestId,
  sources: readonly string[],
): Promise<void> {
  if (sources.length === 0) {
    return;
  }
  const newest = database
    .selectDistinctOn([abilityPoints.source], { id: abilityPoints.id })
    .from(abilityPoints)
    .where(
      and(
        eq(abilityPoints.questId, questId),
        eq(abilityPoints.ability, ability),
        inArray(abilityPoints.source, [...sources]),
      ),
    )
    .orderBy(
      abilityPoints.source,
      desc(abilityPoints.gainedAt),
      desc(abilityPoints.id),
    );
  await database.delete(abilityPoints).where(inArray(abilityPoints.id, newest));
}

// The points a change to the quest's Tasks gains the user, or takes back
// for each task it reopened.
async function changeTaskPoints(
  database: Database,
  gainer: PointGainer,
  before: Tasks,
  after: Tasks,
): Promise<void> {
  const { added, completed, reopened } = taskPointChanges(before, after);
  await gainPoints(database, gainer, "adding-tasks", added.map(String));
  await gainPoints(database, gainer, "completing-tasks", completed.map(String));
  await losePoints(
    database,
    "completing-tasks",
    gainer.questId,
    reopened.map(String),
  );
}

// The user's points in each ability and where they put them.
function readExperience(user: UserId): Promise<Experience> {
  return withAppErrors("readExperience", async () => {
    const rows = await getDb()
      .select({
        ability: abilityPoints.ability,
        points: sql<number>`count(*)::int`,
      })
      .from(abilityPoints)
      .where(eq(abilityPoints.userId, user))
      .groupBy(abilityPoints.ability);
    const points: Record<Ability, number> = { ...NO_POINTS };
    for (const row of rows) {
      const ability = ABILITY.safeParse(row.ability).data;
      if (ability !== undefined) {
        points[ability] = row.points;
      }
    }
    return experienceOf(points);
  });
}

export type { PointGainer };
export { changeTaskPoints, gainPoints, losePoints, readExperience };
