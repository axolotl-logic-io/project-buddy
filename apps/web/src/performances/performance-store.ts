import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import {
  conjurationOpenTo,
  performanceOpenTo,
  questOpenTo,
  spaceOpenTo,
} from "@/accounts/owner-scope.ts";
import { readUserName } from "@/accounts/users-store.ts";
import {
  type Database,
  getDb,
  inTransaction,
  type Transaction,
} from "@/db/client.ts";
import { conjurations, performances } from "@/db/tables/performances.ts";
import { quests } from "@/db/tables/quests-and-chats.ts";
import { spaces } from "@/db/tables/spaces.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import type { QuestId, UserId } from "@/ids.ts";
import { RITE_DEFINITION, riteReply } from "@/rites/rite.ts";
import { readRite } from "@/rites/rite-store.ts";
import { changeWithin } from "@/spaces/murmling-store.ts";
import {
  murmlingLimit,
  SPACE_ID,
  SPACE_WORDS,
  type SpaceId,
} from "@/spaces/space.ts";
import { PERFORMANCE_COPY } from "@/ui/copy/performances.ts";

const PERFORMANCE_ID = z.guid().toLowerCase().brand<"PerformanceId">();
type PerformanceId = z.infer<typeof PERFORMANCE_ID>;

const PERFORMANCE_COLUMNS: {
  readonly id: typeof performances.id;
  readonly spaceId: typeof performances.spaceId;
  readonly rite: typeof performances.riteSnapshot;
  readonly startedAt: typeof performances.startedAt;
  readonly endedAt: typeof performances.endedAt;
  readonly added: typeof performances.added;
  readonly closing: typeof performances.closing;
  readonly spaceName: typeof spaces.name;
} = {
  id: performances.id,
  spaceId: performances.spaceId,
  rite: performances.riteSnapshot,
  startedAt: performances.startedAt,
  endedAt: performances.endedAt,
  added: performances.added,
  closing: performances.closing,
  spaceName: spaces.name,
};

function asPerformance(row: {
  readonly id: string;
  readonly rite: unknown;
  readonly spaceId: string;
  readonly spaceName: string;
  readonly startedAt: Date;
  readonly endedAt: Date | null;
  readonly added: number;
  readonly closing: string | null;
}): {
  id: PerformanceId;
  rite: z.infer<typeof RITE_DEFINITION>;
  spaceId: SpaceId;
  spaceName: string;
  startedAt: Date;
  endedAt: Date | null;
  added: number;
  closing: string | null;
} {
  return {
    ...row,
    id: PERFORMANCE_ID.parse(row.id),
    spaceId: SPACE_ID.parse(row.spaceId),
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
      .innerJoin(spaces, eq(spaces.id, performances.spaceId))
      .where(
        and(
          eq(performances.questId, questId),
          performanceOpenTo(user),
          spaceOpenTo(user),
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
    .innerJoin(spaces, eq(spaces.id, performances.spaceId))
    .where(
      and(
        eq(performances.questId, questId),
        performanceOpenTo(user),
        spaceOpenTo(user),
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
  const [space] = await tx
    .select({ singular: spaces.singular, plural: spaces.plural })
    .from(spaces)
    .where(and(eq(spaces.id, performance.spaceId), spaceOpenTo(user)));
  if (space === undefined) {
    return;
  }
  let noun = space.plural;
  if (performance.added === 1) {
    noun = space.singular;
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

function startPerformance(
  user: UserId,
  questId: QuestId,
  input: { readonly spaceId: SpaceId; readonly riteId: string },
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
      const [space] = await tx
        .select({ name: spaces.name })
        .from(spaces)
        .where(
          and(
            eq(spaces.questId, questId),
            eq(spaces.id, input.spaceId),
            spaceOpenTo(user),
          ),
        );
      if (space === undefined) {
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
          spaceId: input.spaceId,
          riteSnapshot: RITE_DEFINITION.parse(rite),
        })
        .returning();
      if (row === undefined) {
        throw new Error("Inserting a performance returned no performance");
      }
      return asPerformance({
        ...row,
        rite: row.riteSnapshot,
        spaceName: space.name,
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

const CONJURATION = z.object({
  id: z.guid(),
  performanceId: PERFORMANCE_ID,
  text: z.string().refine((text) => text.trim() !== ""),
});
type ConjurationRequest = z.infer<typeof CONJURATION>;
const CONJURATION_COLUMNS: {
  readonly id: typeof conjurations.id;
  readonly author: typeof conjurations.author;
  readonly text: typeof conjurations.text;
  readonly reply: typeof conjurations.reply;
  readonly added: typeof conjurations.added;
  readonly createdAt: typeof conjurations.createdAt;
} = {
  id: conjurations.id,
  author: conjurations.author,
  text: conjurations.text,
  reply: conjurations.reply,
  added: conjurations.added,
  createdAt: conjurations.createdAt,
};
type Conjuration = Pick<
  typeof conjurations.$inferSelect,
  keyof typeof CONJURATION_COLUMNS
>;

function readConjurations(
  user: UserId,
  id: PerformanceId,
): Promise<Conjuration[]> {
  return withAppErrors("readConjurations", async () =>
    getDb()
      .select(CONJURATION_COLUMNS)
      .from(conjurations)
      .where(and(eq(conjurations.performanceId, id), conjurationOpenTo(user)))
      .orderBy(conjurations.position),
  );
}

function conjure(
  user: UserId,
  questId: QuestId,
  input: ConjurationRequest,
): Promise<Conjuration | undefined> {
  return withAppErrors("conjure", async () => {
    const author = (await readUserName(user)) ?? PERFORMANCE_COPY.unnamed;
    return inTransaction(async (tx) => {
      if (!(await lockQuest(tx, user, questId))) {
        return;
      }
      const [saved] = await tx
        .select(CONJURATION_COLUMNS)
        .from(conjurations)
        .innerJoin(
          performances,
          eq(performances.id, conjurations.performanceId),
        )
        .where(
          and(
            eq(performances.questId, questId),
            eq(conjurations.performanceId, input.performanceId),
            eq(conjurations.userId, user),
            eq(conjurations.id, input.id),
            conjurationOpenTo(user),
          ),
        );
      if (saved !== undefined) {
        return saved;
      }
      const performance = await active(tx, user, questId);
      if (performance === undefined || performance.id !== input.performanceId) {
        return;
      }
      return addConjuration(tx, { user, questId, author }, performance, input);
    });
  });
}

async function addConjuration(
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
  input: ConjurationRequest,
): Promise<Conjuration> {
  const { spaceId, rite } = performance;
  const [row] = await tx
    .select()
    .from(spaces)
    .where(and(eq(spaces.id, spaceId), spaceOpenTo(user)));
  const space = SPACE_WORDS.parse(row);
  const [latest] = await tx
    .select({ position: conjurations.position })
    .from(conjurations)
    .where(
      and(
        eq(conjurations.performanceId, performance.id),
        conjurationOpenTo(user),
      ),
    )
    .orderBy(desc(conjurations.position))
    .limit(1);
  const result = await changeWithin(
    tx,
    user,
    { questId, spaceId },
    { kind: "add", text: input.text },
  );
  let added = 0;
  let reply = PERFORMANCE_COPY.refused(
    murmlingLimit(space.newType),
    space.singular,
  );
  if (result === "saved") {
    added = 1;
    reply = riteReply(rite, space, { text: input.text, author });
    await tx
      .update(performances)
      .set({ added: sql`${performances.added} + 1` })
      .where(and(eq(performances.id, performance.id), performanceOpenTo(user)));
  }
  const [entry] = await tx
    .insert(conjurations)
    .values({
      id: input.id,
      performanceId: performance.id,
      userId: user,
      author,
      text: input.text,
      reply,
      added,
      position: (latest?.position ?? -1) + 1,
    })
    .returning(CONJURATION_COLUMNS);
  if (entry === undefined) {
    throw new Error("Inserting a conjuration returned no conjuration");
  }
  return entry;
}

export type { Conjuration, Performance, PerformanceId };
export {
  CONJURATION,
  conjure,
  listPerformances,
  PERFORMANCE_ID,
  readConjurations,
  startPerformance,
  stopPerformance,
};
