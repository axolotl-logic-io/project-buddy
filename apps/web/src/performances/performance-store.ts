import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import {
  listOpenTo,
  performanceMessageOpenTo,
  performanceOpenTo,
  questOpenTo,
} from "@/accounts/owner-scope.ts";
import { readUserName } from "@/accounts/users-store.ts";
import {
  type Database,
  getDb,
  inTransaction,
  type Transaction,
} from "@/db/client.ts";
import { lists } from "@/db/tables/lists.ts";
import { performanceMessages, performances } from "@/db/tables/performances.ts";
import { questDays } from "@/db/tables/quest-days.ts";
import { quests } from "@/db/tables/quests.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import type { QuestId, UserId } from "@/ids.ts";
import {
  LIST_ID,
  LIST_SETTINGS,
  LIST_TYPE,
  type ListId,
  listItemLimit,
} from "@/lists/list.ts";
import { changeWithin } from "@/lists/list-item-store.ts";
import { RITE_DEFINITION, riteReply } from "@/rites/rite.ts";
import { readRite } from "@/rites/rite-store.ts";
import { LISTS_COPY } from "@/ui/copy/lists.ts";
import { PERFORMANCE_COPY } from "@/ui/copy/performances.ts";

const PERFORMANCE_ID = z.guid().toLowerCase().brand<"PerformanceId">();
type PerformanceId = z.infer<typeof PERFORMANCE_ID>;

const PERFORMANCE_COLUMNS: {
  readonly id: typeof performances.id;
  readonly listId: typeof performances.listId;
  readonly rite: typeof performances.riteSnapshot;
  readonly startedAt: typeof performances.startedAt;
  readonly endedAt: typeof performances.endedAt;
  readonly added: typeof performances.added;
  readonly closing: typeof performances.closing;
  readonly listName: typeof lists.name;
} = {
  id: performances.id,
  listId: performances.listId,
  rite: performances.riteSnapshot,
  startedAt: performances.startedAt,
  endedAt: performances.endedAt,
  added: performances.added,
  closing: performances.closing,
  listName: lists.name,
};

function asPerformance(row: {
  readonly id: string;
  readonly rite: unknown;
  readonly listId: string;
  readonly listName: string;
  readonly startedAt: Date;
  readonly endedAt: Date | null;
  readonly added: number;
  readonly closing: string | null;
}): {
  id: PerformanceId;
  rite: z.infer<typeof RITE_DEFINITION>;
  listId: ListId;
  listName: string;
  startedAt: Date;
  endedAt: Date | null;
  added: number;
  closing: string | null;
} {
  return {
    ...row,
    id: PERFORMANCE_ID.parse(row.id),
    listId: LIST_ID.parse(row.listId),
    rite: RITE_DEFINITION.parse(row.rite),
  };
}

type Performance = ReturnType<typeof asPerformance>;

function listPerformances(
  user: UserId,
  questId: QuestId,
): Promise<Performance[]> {
  return withAppErrors("listPerformances", async () => {
    const rows = await getDb()
      .select(PERFORMANCE_COLUMNS)
      .from(performances)
      .innerJoin(lists, eq(lists.id, performances.listId))
      .where(
        and(
          eq(performances.questId, questId),
          performanceOpenTo(user),
          listOpenTo(user),
        ),
      )
      .orderBy(desc(performances.startedAt), desc(performances.id));
    return rows.map(asPerformance);
  });
}

async function lockQuest(
  tx: Transaction,
  user: UserId,
  questId: QuestId,
): Promise<boolean> {
  const [quest] = await tx
    .select({ id: quests.id })
    .from(quests)
    .where(and(eq(quests.id, questId), questOpenTo(user)))
    .for("update");
  return quest !== undefined;
}

async function active(
  tx: Database,
  user: UserId,
  questId: QuestId,
): Promise<Performance | undefined> {
  const [row] = await tx
    .select(PERFORMANCE_COLUMNS)
    .from(performances)
    .innerJoin(lists, eq(lists.id, performances.listId))
    .where(
      and(
        eq(performances.questId, questId),
        performanceOpenTo(user),
        listOpenTo(user),
        isNull(performances.endedAt),
      ),
    );
  if (row !== undefined) {
    return asPerformance(row);
  }
  return undefined;
}

async function stopWithin(
  tx: Transaction,
  user: UserId,
  performance: Performance,
): Promise<void> {
  const [list] = await tx
    .select({ type: lists.type })
    .from(lists)
    .where(and(eq(lists.id, performance.listId), listOpenTo(user)));
  if (list === undefined) {
    return;
  }
  const nouns = LISTS_COPY.nouns(LIST_TYPE.parse(list.type));
  let noun = nouns.many;
  if (performance.added === 1) {
    noun = nouns.one;
  }
  await tx
    .update(performances)
    .set({
      endedAt: new Date(),
      closing: PERFORMANCE_COPY.closing(
        performance.rite.name,
        performance.added,
        noun,
      ),
    })
    .where(and(eq(performances.id, performance.id), performanceOpenTo(user)));
}

// The caller holds the quest lock while changing a day and its performance.
async function closePerformanceForDay(
  tx: Transaction,
  user: UserId,
  questId: QuestId,
): Promise<PerformanceId | undefined> {
  const performance = await active(tx, user, questId);
  if (performance === undefined) {
    return undefined;
  }
  await stopWithin(tx, user, performance);
  return performance.id;
}

async function restorePerformanceForDay(
  tx: Transaction,
  user: UserId,
  questId: QuestId,
  id: PerformanceId,
): Promise<void> {
  await closePerformanceForDay(tx, user, questId);
  await tx
    .update(performances)
    .set({ endedAt: null, closing: null })
    .where(
      and(
        eq(performances.id, id),
        eq(performances.questId, questId),
        performanceOpenTo(user),
      ),
    );
}

function startPerformance(
  user: UserId,
  questId: QuestId,
  input: { readonly listId: ListId; readonly riteId: string },
): Promise<Performance | undefined> {
  return withAppErrors("startPerformance", async () => {
    const rite = await readRite(user, input.riteId);
    if (rite === undefined) {
      return;
    }
    return inTransaction(async (tx) => {
      if (!(await lockQuest(tx, user, questId))) {
        return;
      }
      const [list] = await tx
        .select({ name: lists.name })
        .from(lists)
        .where(
          and(
            eq(lists.questId, questId),
            eq(lists.id, input.listId),
            listOpenTo(user),
          ),
        );
      if (list === undefined) {
        return;
      }
      const previous = await active(tx, user, questId);
      if (previous !== undefined) {
        await stopWithin(tx, user, previous);
      }
      const [row] = await tx
        .insert(performances)
        .values({
          questId,
          listId: input.listId,
          riteSnapshot: RITE_DEFINITION.parse(rite),
        })
        .returning();
      if (row === undefined) {
        throw new Error("Inserting a performance returned no performance");
      }
      return asPerformance({
        ...row,
        rite: row.riteSnapshot,
        listName: list.name,
      });
    });
  });
}

function stopPerformance(
  user: UserId,
  questId: QuestId,
  id: PerformanceId,
): Promise<boolean> {
  return withAppErrors("stopPerformance", () =>
    inTransaction(async (tx) => {
      if (!(await lockQuest(tx, user, questId))) {
        return false;
      }
      const performance = await active(tx, user, questId);
      if (performance?.id !== id) {
        return false;
      }
      await stopWithin(tx, user, performance);
      return true;
    }),
  );
}

const PERFORMANCE_MESSAGE = z.object({
  id: z.guid(),
  performanceId: PERFORMANCE_ID,
  text: z.string().refine((text) => text.trim() !== ""),
});
type PerformanceMessageRequest = z.infer<typeof PERFORMANCE_MESSAGE>;
const PERFORMANCE_MESSAGE_COLUMNS: {
  readonly id: typeof performanceMessages.id;
  readonly author: typeof performanceMessages.author;
  readonly text: typeof performanceMessages.text;
  readonly reply: typeof performanceMessages.reply;
  readonly added: typeof performanceMessages.added;
  readonly createdAt: typeof performanceMessages.createdAt;
} = {
  id: performanceMessages.id,
  author: performanceMessages.author,
  text: performanceMessages.text,
  reply: performanceMessages.reply,
  added: performanceMessages.added,
  createdAt: performanceMessages.createdAt,
};
type PerformanceMessage = Pick<
  typeof performanceMessages.$inferSelect,
  keyof typeof PERFORMANCE_MESSAGE_COLUMNS
>;

function readPerformanceMessages(
  user: UserId,
  id: PerformanceId,
): Promise<PerformanceMessage[]> {
  return withAppErrors("readPerformanceMessages", async () =>
    getDb()
      .select(PERFORMANCE_MESSAGE_COLUMNS)
      .from(performanceMessages)
      .where(
        and(
          eq(performanceMessages.performanceId, id),
          performanceMessageOpenTo(user),
        ),
      )
      .orderBy(performanceMessages.position),
  );
}

function sendMessage(
  user: UserId,
  questId: QuestId,
  input: PerformanceMessageRequest,
): Promise<PerformanceMessage | undefined> {
  return withAppErrors("sendMessage", async () => {
    const author = (await readUserName(user)) ?? PERFORMANCE_COPY.unnamed;
    return inTransaction(async (tx) => {
      if (!(await lockQuest(tx, user, questId))) {
        return;
      }
      const [saved] = await tx
        .select(PERFORMANCE_MESSAGE_COLUMNS)
        .from(performanceMessages)
        .innerJoin(
          performances,
          eq(performances.id, performanceMessages.performanceId),
        )
        .where(
          and(
            eq(performances.questId, questId),
            eq(performanceMessages.performanceId, input.performanceId),
            eq(performanceMessages.userId, user),
            eq(performanceMessages.id, input.id),
            performanceMessageOpenTo(user),
          ),
        );
      if (saved !== undefined) {
        return saved;
      }
      const performance = await active(tx, user, questId);
      if (performance === undefined || performance.id !== input.performanceId) {
        return;
      }
      const entry = await addPerformanceMessage(
        tx,
        { user, questId, author },
        performance,
        input,
      );
      await tx
        .update(questDays)
        .set({ undo: null })
        .where(eq(questDays.questId, questId));
      return entry;
    });
  });
}

async function addPerformanceMessage(
  tx: Transaction,
  {
    user,
    questId,
    author,
  }: {
    readonly user: UserId;
    readonly questId: QuestId;
    readonly author: string;
  },
  performance: Performance,
  input: PerformanceMessageRequest,
): Promise<PerformanceMessage> {
  const { listId, rite } = performance;
  const [row] = await tx
    .select()
    .from(lists)
    .where(and(eq(lists.id, listId), listOpenTo(user)));
  const list = LIST_SETTINGS.parse(row);
  const latestMessagePosition = tx
    .select({ position: performanceMessages.position })
    .from(performanceMessages)
    .where(
      and(
        eq(performanceMessages.performanceId, performance.id),
        performanceMessageOpenTo(user),
      ),
    )
    .orderBy(desc(performanceMessages.position))
    .limit(1);
  const result = await changeWithin(
    tx,
    user,
    { questId, listId },
    { kind: "add", text: input.text },
  );
  let added = 0;
  let reply = PERFORMANCE_COPY.refused(
    listItemLimit(list.type),
    LISTS_COPY.nouns(list.type).one,
  );
  if (result === "saved") {
    added = 1;
    reply = riteReply(rite, list, { text: input.text, author });
    await tx
      .update(performances)
      .set({ added: sql`${performances.added} + 1` })
      .where(and(eq(performances.id, performance.id), performanceOpenTo(user)));
  }
  const [entry] = await tx
    .insert(performanceMessages)
    .values({
      id: input.id,
      performanceId: performance.id,
      userId: user,
      author,
      text: input.text,
      reply,
      added,
      position: sql<number>`coalesce((${latestMessagePosition}), -1) + 1`,
    })
    .returning(PERFORMANCE_MESSAGE_COLUMNS);
  if (entry === undefined) {
    throw new Error("Inserting a performance message returned none");
  }
  return entry;
}

export type { Performance, PerformanceId, PerformanceMessage };
export {
  closePerformanceForDay,
  listPerformances,
  PERFORMANCE_ID,
  PERFORMANCE_MESSAGE,
  readPerformanceMessages,
  restorePerformanceForDay,
  sendMessage,
  startPerformance,
  stopPerformance,
};
