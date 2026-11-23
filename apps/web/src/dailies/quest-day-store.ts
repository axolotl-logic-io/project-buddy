import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import {
  murmlingOpenTo,
  questDayOwnedBy,
  questOwnedBy,
  spaceOpenTo,
} from "@/accounts/owner-scope.ts";
import { getDb, inTransaction, type Transaction } from "@/db/client.ts";
import { questDays } from "@/db/tables/quest-days.ts";
import { quests } from "@/db/tables/quests.ts";
import { murmlings, spaces } from "@/db/tables/spaces.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import type { QuestId, UserId } from "@/ids.ts";
import {
  closePerformanceForDay,
  PERFORMANCE_ID,
  restorePerformanceForDay,
} from "@/performances/performance-store.ts";
import { MURMLING_ID } from "@/spaces/murmling.ts";
import { MURMLING_RECORD } from "@/spaces/murmling-record.ts";
import type { SpaceId } from "@/spaces/space.ts";
import {
  DAY_TASK,
  type DailiesRecord,
  type DayTasks,
  type LocalDate,
} from "./dailies.ts";

const MOST_DAYS = 400;

const DAY_UNDO = z.object({
  performance: PERFORMANCE_ID.optional(),
  removed: z.array(MURMLING_RECORD),
  reset: z.array(MURMLING_ID),
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

function questMurmlings(
  tx: Transaction,
  user: UserId,
  questId: QuestId,
): Promise<(typeof murmlings.$inferSelect)[]> {
  return Promise.resolve(
    tx
      .select()
      .from(murmlings)
      .where(and(eq(murmlings.questId, questId), murmlingOpenTo(user)))
      .orderBy(murmlings.position, murmlings.id),
  );
}

function readRecurringTasks(user: UserId, questId: QuestId): Promise<DayTasks> {
  return withAppErrors("readRecurringTasks", async () => {
    const rows = await getDb()
      .select({
        number: murmlings.taskNumber,
        text: murmlings.text,
        done: murmlings.checkedOff,
      })
      .from(murmlings)
      .innerJoin(spaces, eq(spaces.id, murmlings.spaceId))
      .where(
        and(
          eq(murmlings.questId, questId),
          murmlingOpenTo(user),
          spaceOpenTo(user),
          eq(murmlings.recurring, true),
        ),
      )
      .orderBy(spaces.position, murmlings.position, murmlings.id);
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

async function bumpSpaces(
  tx: Transaction,
  user: UserId,
  ids: readonly string[],
): Promise<void> {
  if (ids.length > 0) {
    await tx
      .update(spaces)
      .set({ version: sql`${spaces.version} + 1` })
      .where(and(inArray(spaces.id, [...ids]), spaceOpenTo(user)));
  }
}

function startQuestDay(
  owner: UserId,
  questId: QuestId,
  options: {
    readonly localDate: LocalDate;
    readonly emptySpaces: readonly SpaceId[];
  },
): Promise<boolean> {
  return withAppErrors("startQuestDay", () =>
    inTransaction(async (tx) => {
      if (!(await lockDailies(tx, owner, questId))) {
        return false;
      }
      const { localDate, emptySpaces } = options;
      if (emptySpaces.length > 0) {
        const selected = await tx
          .select({ id: spaces.id })
          .from(spaces)
          .where(
            and(
              eq(spaces.questId, questId),
              inArray(spaces.id, [...emptySpaces]),
              spaceOpenTo(owner),
            ),
          );
        if (selected.length !== new Set(emptySpaces).size) {
          return false;
        }
      }
      const [previous] = await recentDays(owner, questId, tx, 1);
      const rows = await questMurmlings(tx, owner, questId);
      const removedSpaces = new Set<string>(emptySpaces);
      const removed = rows.filter(({ spaceId }) => removedSpaces.has(spaceId));
      const reset = rows.filter(
        (row) =>
          !removedSpaces.has(row.spaceId) && row.recurring && row.checkedOff,
      );
      if (previous !== undefined) {
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
          .where(and(eq(questDays.id, previous.id), dayScope(owner, questId)));
      }
      if (removed.length > 0) {
        await tx.delete(murmlings).where(
          and(
            inArray(
              murmlings.id,
              removed.map(({ id }) => id),
            ),
            murmlingOpenTo(owner),
          ),
        );
      }
      if (reset.length > 0) {
        await tx
          .update(murmlings)
          .set({ checkedOff: false })
          .where(
            and(
              inArray(
                murmlings.id,
                reset.map(({ id }) => id),
              ),
              murmlingOpenTo(owner),
            ),
          );
      }
      await bumpSpaces(tx, owner, [
        ...removedSpaces,
        ...reset.map(({ spaceId }) => spaceId),
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

async function restoreMurmlings(
  tx: Transaction,
  owner: UserId,
  questId: QuestId,
  undo: DayUndo,
): Promise<void> {
  const current = await questMurmlings(tx, owner, questId);
  const changed = new Set<string>();
  const reset = new Set<string>(undo.reset);
  const recurring = current.filter(
    (row) =>
      reset.has(row.id) &&
      row.type === "task" &&
      row.recurring &&
      !row.checkedOff,
  );
  if (recurring.length > 0) {
    await tx
      .update(murmlings)
      .set({ checkedOff: true })
      .where(
        and(
          inArray(
            murmlings.id,
            recurring.map(({ id }) => id),
          ),
          murmlingOpenTo(owner),
        ),
      );
    for (const { spaceId } of recurring) {
      changed.add(spaceId);
    }
  }
  const spacesToRestore = new Set(undo.removed.map(({ spaceId }) => spaceId));
  const restored = [...spacesToRestore].flatMap((spaceId) => {
    const removed = undo.removed.filter((row) => row.spaceId === spaceId);
    const first = current.find((row) => row.spaceId === spaceId);
    const start = (first?.position ?? 0) - removed.length;
    changed.add(spaceId);
    return removed.map((row, index) => ({ ...row, position: start + index }));
  });
  if (restored.length > 0) {
    await tx.insert(murmlings).values(restored).onConflictDoNothing();
  }
  await bumpSpaces(tx, owner, [...changed]);
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
      await restoreMurmlings(tx, owner, questId, undo);
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
