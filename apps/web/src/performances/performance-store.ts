import {
  and,
  desc,
  eq,
  isNotNull,
  isNull,
  sql,
  TransactionRollbackError,
} from "drizzle-orm";
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
import { expireReads, keepRead } from "@/db/read-cache.ts";
import { lists } from "@/db/tables/lists.ts";
import { performanceMessages, performances } from "@/db/tables/performances.ts";
import { quests } from "@/db/tables/quests.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import {
  parseQuestId,
  PERFORMANCE_ID,
  type PerformanceId,
  type QuestId,
  type UserId,
} from "@/ids.ts";
import {
  LIST_ID,
  LIST_SETTINGS,
  LIST_TYPE,
  type ListId,
  type ListType,
} from "@/lists/list.ts";
import { changeWithin } from "@/lists/list-item-store.ts";
import { keepQuestRead } from "@/quests/quest-reads.ts";
import {
  nextReply,
  REPLY_CHOICE,
  RITE_DEFINITION,
  riteReply,
} from "@/rites/rite.ts";
import { readRite } from "@/rites/rite-store.ts";
import { LISTS_COPY } from "@/ui/copy/lists.ts";
import { PERFORMANCE_COPY } from "@/ui/copy/performances.ts";
import { refusedNote } from "./performance-turn.ts";

const PERFORMANCE_COLUMNS: {
  readonly id: typeof performances.id;
  readonly listId: typeof performances.listId;
  readonly rite: typeof performances.riteSnapshot;
  readonly startedAt: typeof performances.startedAt;
  readonly endedAt: typeof performances.endedAt;
  readonly added: typeof performances.added;
  readonly closing: typeof performances.closing;
  readonly listName: typeof lists.name;
  readonly listType: typeof lists.type;
} = {
  id: performances.id,
  listId: performances.listId,
  rite: performances.riteSnapshot,
  startedAt: performances.startedAt,
  endedAt: performances.endedAt,
  added: performances.added,
  closing: performances.closing,
  listName: lists.name,
  listType: lists.type,
};

function asPerformance(row: {
  readonly id: string;
  readonly rite: unknown;
  readonly listId: string;
  readonly listName: string;
  readonly listType: string;
  readonly startedAt: Date;
  readonly endedAt: Date | null;
  readonly added: number;
  readonly closing: string | null;
}): {
  id: PerformanceId;
  rite: z.infer<typeof RITE_DEFINITION>;
  listId: ListId;
  listName: string;
  listType: ListType;
  startedAt: Date;
  endedAt: Date | null;
  added: number;
  closing: string | null;
} {
  return {
    ...row,
    id: PERFORMANCE_ID.parse(row.id),
    listId: LIST_ID.parse(row.listId),
    listType: LIST_TYPE.parse(row.listType),
    rite: RITE_DEFINITION.parse(row.rite),
  };
}

type Performance = ReturnType<typeof asPerformance>;

async function listPerformances(
  user: UserId,
  questId: QuestId,
): Promise<Performance[]> {
  "use cache";
  keepQuestRead(user, questId);
  return await withAppErrors("listPerformances", async () => {
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

// Starts a performance with the id the browser made for it, or none when
// the rite or list is not the user's or a performance has that id already.
async function startPerformance(
  user: UserId,
  questId: QuestId,
  input: {
    readonly id: PerformanceId;
    readonly listId: ListId;
    readonly riteId: string;
  },
): Promise<Performance | undefined> {
  const started = await withAppErrors("startPerformance", async () => {
    const rite = await readRite(user, input.riteId);
    if (rite === undefined) {
      return;
    }
    return inTransaction(async (tx) => {
      if (!(await lockQuest(tx, user, questId))) {
        return;
      }
      const [list] = await tx
        .select({ name: lists.name, type: lists.type })
        .from(lists)
        .where(
          and(
            eq(lists.questId, questId),
            eq(lists.id, input.listId),
            listOpenTo(user),
          ),
        );
      // A rite adds list items, which a Zotero Collection list never takes.
      if (list === undefined || list.type === "zotero-collection") {
        return;
      }
      const previous = await active(tx, user, questId);
      if (previous !== undefined) {
        await stopWithin(tx, user, previous);
      }
      const [row] = await tx
        .insert(performances)
        .values({
          id: input.id,
          questId,
          listId: input.listId,
          riteSnapshot: RITE_DEFINITION.parse(rite),
        })
        .onConflictDoNothing({ target: performances.id })
        .returning();
      if (row === undefined) {
        // The id is already in use. Keep the previous performance active.
        tx.rollback();
      }
      return asPerformance({
        ...row,
        rite: row.riteSnapshot,
        listName: list.name,
        listType: list.type,
      });
    }).catch((error: unknown): undefined => {
      if (error instanceof TransactionRollbackError) {
        return;
      }
      throw error;
    });
  });
  expireReads({ accounts: [user], quests: [questId] });
  return started;
}

async function stopPerformance(
  user: UserId,
  questId: QuestId,
  id: PerformanceId,
): Promise<boolean> {
  const stopped = await withAppErrors("stopPerformance", () =>
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
  expireReads({ accounts: [user], quests: [questId] });
  return stopped;
}

// A message to send, with the rite's reply the sender's browser chose for
// it, if any; the rite chooses when that reply is absent or one it could
// not have given.
const PERFORMANCE_MESSAGE = z.object({
  id: z.guid(),
  performanceId: PERFORMANCE_ID,
  text: z.string().refine((text) => text.trim() !== ""),
  reply: REPLY_CHOICE.optional(),
});
type PerformanceMessageRequest = z.infer<typeof PERFORMANCE_MESSAGE>;
const PERFORMANCE_MESSAGE_COLUMNS: {
  readonly id: typeof performanceMessages.id;
  readonly author: typeof performanceMessages.author;
  readonly text: typeof performanceMessages.text;
  readonly reply: typeof performanceMessages.reply;
  readonly replyIndex: typeof performanceMessages.replyIndex;
  readonly added: typeof performanceMessages.added;
  readonly createdAt: typeof performanceMessages.createdAt;
} = {
  id: performanceMessages.id,
  author: performanceMessages.author,
  text: performanceMessages.text,
  reply: performanceMessages.reply,
  replyIndex: performanceMessages.replyIndex,
  added: performanceMessages.added,
  createdAt: performanceMessages.createdAt,
};
type PerformanceMessage = Pick<
  typeof performanceMessages.$inferSelect,
  keyof typeof PERFORMANCE_MESSAGE_COLUMNS
>;

async function readPerformanceMessages(
  user: UserId,
  id: PerformanceId,
): Promise<PerformanceMessage[]> {
  "use cache";
  return await withAppErrors("readPerformanceMessages", async () => {
    const [performance] = await getDb()
      .select({ questId: performances.questId })
      .from(performances)
      .where(and(eq(performances.id, id), performanceOpenTo(user)));
    keepRead(user, [parseQuestId(performance?.questId ?? "") ?? []].flat());
    return await getDb()
      .select(PERFORMANCE_MESSAGE_COLUMNS)
      .from(performanceMessages)
      .where(
        and(
          eq(performanceMessages.performanceId, id),
          performanceMessageOpenTo(user),
        ),
      )
      .orderBy(performanceMessages.position);
  });
}

async function sendMessage(
  user: UserId,
  questId: QuestId,
  input: PerformanceMessageRequest,
): Promise<PerformanceMessage | undefined> {
  const sent = await withAppErrors("sendMessage", async () => {
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
      return entry;
    });
  });
  expireReads({ accounts: [user], quests: [questId] });
  return sent;
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
  let reply = refusedNote(list.type);
  let replyIndex: number | null = null;
  let concluded = false;
  if (result === "saved") {
    const given = await tx
      .select({ index: performanceMessages.replyIndex })
      .from(performanceMessages)
      .where(
        and(
          eq(performanceMessages.performanceId, performance.id),
          isNotNull(performanceMessages.replyIndex),
          performanceMessageOpenTo(user),
        ),
      )
      .orderBy(performanceMessages.position);
    const choice = nextReply(
      rite,
      given.flatMap(({ index }) => index ?? []),
      Math.random,
      input.reply,
    );
    added = 1;
    reply = riteReply(rite, choice, list, { text: input.text, author });
    if (choice.kind === "reply") {
      replyIndex = choice.index;
    }
    concluded = choice.kind === "final";
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
      replyIndex,
      added,
      position: sql<number>`coalesce((${latestMessagePosition}), -1) + 1`,
    })
    .returning(PERFORMANCE_MESSAGE_COLUMNS);
  if (entry === undefined) {
    throw new Error("Inserting a performance message returned none");
  }
  if (concluded) {
    await stopWithin(tx, user, {
      ...performance,
      added: performance.added + added,
    });
  }
  return entry;
}

export type { Performance, PerformanceMessage };
export {
  listPerformances,
  PERFORMANCE_MESSAGE,
  readPerformanceMessages,
  sendMessage,
  startPerformance,
  stopPerformance,
};
