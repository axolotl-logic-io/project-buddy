import { and, desc, eq } from "drizzle-orm";
import { questOpenTo, spaceOpenTo } from "@/accounts/owner-scope.ts";
import {
  type Database,
  getDb,
  inTransaction,
  type Transaction,
} from "@/db/client.ts";
import { quests } from "@/db/tables/quests.ts";
import { spaces } from "@/db/tables/spaces.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import type { QuestId, UserId } from "@/ids.ts";
import {
  SPACE_ID,
  SPACE_WORDS,
  type SpaceId,
  type SpaceWords,
  STARTING_SPACES,
} from "./space.ts";

interface Space extends SpaceWords {
  readonly id: SpaceId;
  readonly position: number;
  readonly version: number;
}

function toSpace(row: typeof spaces.$inferSelect): Space {
  return {
    ...SPACE_WORDS.parse(row),
    id: SPACE_ID.parse(row.id),
    position: row.position,
    version: row.version,
  };
}

async function seedSpaces(tx: Transaction, questId: QuestId): Promise<void> {
  await tx.insert(spaces).values(
    STARTING_SPACES.map((words, position) => ({
      ...words,
      questId,
      position,
    })),
  );
}

function listSpaces(user: UserId, questId: QuestId): Promise<Space[]> {
  return withAppErrors("listSpaces", async () => {
    const rows = await getDb()
      .select()
      .from(spaces)
      .where(and(eq(spaces.questId, questId), spaceOpenTo(user)))
      .orderBy(spaces.position);
    return rows.map(toSpace);
  });
}

async function readSpace(
  db: Database,
  user: UserId,
  questId: QuestId,
  spaceId: SpaceId,
): Promise<Space | undefined> {
  const [row] = await db
    .select()
    .from(spaces)
    .where(
      and(
        eq(spaces.questId, questId),
        eq(spaces.id, spaceId),
        spaceOpenTo(user),
      ),
    );
  if (row === undefined) {
    return undefined;
  }
  return toSpace(row);
}

function saveSpace(
  user: UserId,
  questId: QuestId,
  words: SpaceWords,
  spaceId?: SpaceId,
): Promise<Space | undefined> {
  return withAppErrors("saveSpace", () =>
    inTransaction(async (tx) => {
      const [quest] = await tx
        .select({ id: quests.id })
        .from(quests)
        .where(and(eq(quests.id, questId), questOpenTo(user)))
        .for("update");
      if (quest === undefined) {
        return;
      }
      if (spaceId !== undefined) {
        const [updated] = await tx
          .update(spaces)
          .set(words)
          .where(
            and(
              eq(spaces.questId, questId),
              eq(spaces.id, spaceId),
              spaceOpenTo(user),
            ),
          )
          .returning();
        if (updated !== undefined) {
          return toSpace(updated);
        }
        return;
      }
      const [last] = await tx
        .select({ position: spaces.position })
        .from(spaces)
        .where(and(eq(spaces.questId, questId), spaceOpenTo(user)))
        .orderBy(desc(spaces.position))
        .limit(1);
      const [added] = await tx
        .insert(spaces)
        .values({ ...words, questId, position: (last?.position ?? -1) + 1 })
        .returning();
      if (added === undefined) {
        throw new Error("Inserting a space returned no space");
      }
      return toSpace(added);
    }),
  );
}

export type { Space };
export { listSpaces, readSpace, saveSpace, seedSpaces };
