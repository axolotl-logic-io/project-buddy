import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import {
  murmlingOpenTo,
  spaceChangeOpenTo,
  spaceOpenTo,
} from "@/accounts/owner-scope.ts";
import type { Transaction } from "@/db/client.ts";
import { events } from "@/db/tables/events.ts";
import { spaceChanges } from "@/db/tables/space-changes.ts";
import { murmlings, spaces } from "@/db/tables/spaces.ts";
import { users } from "@/db/tables/users.ts";
import { QUEST_ID, type QuestId, USER_ID, type UserId } from "@/ids.ts";
import { MURMLING_ID } from "./murmling.ts";
import { MURMLING_RECORD } from "./murmling-record.ts";
import type { SpaceId } from "./space.ts";

const CHECK_OFF = z.object({
  id: z.guid(),
  userId: USER_ID,
  questId: QUEST_ID,
  event: z.literal("checking-off"),
  source: z.string(),
  gainedAt: z.union([
    z.date(),
    z.iso.datetime().transform((value) => new Date(value)),
  ]),
});

const SPACE_INVERSE = z.object({
  kind: z.enum([
    "add",
    "edit",
    "type",
    "check",
    "recurring",
    "remove",
    "move",
    "place",
    "reorder",
  ]),
  before: MURMLING_RECORD.optional(),
  after: MURMLING_RECORD.optional(),
  neighbour: MURMLING_ID.optional(),
  checkOff: CHECK_OFF.optional(),
  checkOffAfter: CHECK_OFF.optional(),
});

type Inverse = z.infer<typeof SPACE_INVERSE>;
type SavedRow = z.infer<typeof MURMLING_RECORD>;
type Row = typeof murmlings.$inferSelect;
interface Scope {
  readonly tx: Transaction;
  readonly user: UserId;
  readonly questId: QuestId;
}

async function undoCheckOff(
  { tx }: Scope,
  { after, checkOff, checkOffAfter }: Inverse,
): Promise<void> {
  if (checkOffAfter?.id === checkOff?.id) {
    return;
  }
  if (after?.checkedOff === true && checkOffAfter !== undefined) {
    await tx.delete(events).where(eq(events.id, checkOffAfter.id));
  }
  if (after?.checkedOff !== true && checkOff !== undefined) {
    const [actor] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, checkOff.userId));
    if (actor !== undefined) {
      await tx.insert(events).values(checkOff).onConflictDoNothing();
    }
  }
}

async function restoredPosition(
  { tx, user, questId }: Scope,
  spaceId: SpaceId,
  neighbour?: SavedRow["id"],
): Promise<number> {
  const scope = and(
    eq(murmlings.questId, questId),
    eq(murmlings.spaceId, spaceId),
    murmlingOpenTo(user),
  );
  if (neighbour !== undefined) {
    const [anchor] = await tx
      .select({ position: murmlings.position })
      .from(murmlings)
      .where(and(scope, eq(murmlings.id, neighbour)));
    if (anchor !== undefined) {
      await tx
        .update(murmlings)
        .set({ position: sql`${murmlings.position} + 1` })
        .where(and(scope, sql`${murmlings.position} >= ${anchor.position}`));
      return anchor.position;
    }
  }
  const [last] = await tx
    .select({ position: murmlings.position })
    .from(murmlings)
    .where(scope)
    .orderBy(desc(murmlings.position))
    .limit(1);
  return (last?.position ?? -1) + 1;
}

function sameType(a: Row, b: SavedRow): boolean {
  return (
    a.type === b.type &&
    a.taskNumber === b.taskNumber &&
    a.checkedOff === b.checkedOff &&
    a.recurring === b.recurring
  );
}

async function reverseExisting(
  scope: Scope,
  inverse: Inverse,
  rows: {
    readonly current: Row;
    readonly before: SavedRow;
    readonly after: SavedRow;
  },
): Promise<boolean> {
  const { tx, user } = scope;
  const { current, before, after } = rows;
  const target = and(eq(murmlings.id, current.id), murmlingOpenTo(user));
  switch (inverse.kind) {
    case "edit":
      if (current.text !== after.text) {
        return false;
      }
      await tx.update(murmlings).set({ text: before.text }).where(target);
      return true;
    case "check":
      if (
        current.taskNumber !== after.taskNumber ||
        current.checkedOff !== after.checkedOff
      ) {
        return false;
      }
      await tx
        .update(murmlings)
        .set({ checkedOff: before.checkedOff })
        .where(target);
      await undoCheckOff(scope, inverse);
      return true;
    case "type": {
      if (!sameType(current, after)) {
        return false;
      }
      const { type, taskNumber, checkedOff, recurring } = before;
      await tx
        .update(murmlings)
        .set({ type, taskNumber, checkedOff, recurring })
        .where(target);
      await undoCheckOff(scope, inverse);
      return true;
    }
    case "recurring":
      if (
        current.taskNumber !== after.taskNumber ||
        current.recurring !== after.recurring
      ) {
        return false;
      }
      await tx
        .update(murmlings)
        .set({ recurring: before.recurring })
        .where(target);
      return true;
    case "move":
    case "place":
    case "reorder": {
      if (
        current.spaceId !== after.spaceId ||
        current.position !== after.position
      ) {
        return false;
      }
      const position = await restoredPosition(
        scope,
        before.spaceId,
        inverse.neighbour,
      );
      await tx
        .update(murmlings)
        .set({ spaceId: before.spaceId, position })
        .where(target);
      return true;
    }
    default:
      return false;
  }
}

async function reverse(scope: Scope, inverse: Inverse): Promise<boolean> {
  const { tx, user, questId } = scope;
  const { before, after } = inverse;
  const id = after?.id ?? before?.id;
  if (id === undefined) {
    return false;
  }
  const target = and(
    eq(murmlings.id, id),
    eq(murmlings.questId, questId),
    murmlingOpenTo(user),
  );
  const [current] = await tx.select().from(murmlings).where(target);
  if (after === undefined && before !== undefined && current === undefined) {
    const position = await restoredPosition(
      scope,
      before.spaceId,
      inverse.neighbour,
    );
    await tx.insert(murmlings).values({ ...before, position });
    return true;
  }
  if (after === undefined || current === undefined) {
    return false;
  }
  if (before !== undefined) {
    return reverseExisting(scope, inverse, { before, after, current });
  }
  if (
    current.text !== after.text ||
    !sameType(current, after) ||
    current.spaceId !== after.spaceId
  ) {
    return false;
  }
  await tx.delete(murmlings).where(target);
  return true;
}

async function undoSpaceChange(
  tx: Transaction,
  user: UserId,
  {
    questId,
    spaceId,
  }: { readonly questId: QuestId; readonly spaceId: SpaceId },
  version: number,
): Promise<"saved" | "missing" | "unchanged"> {
  const [row] = await tx
    .select({ inverse: spaceChanges.inverse })
    .from(spaceChanges)
    .where(
      and(
        eq(spaceChanges.spaceId, spaceId),
        eq(spaceChanges.version, version),
        spaceChangeOpenTo(user),
      ),
    );
  if (row === undefined) {
    return "missing";
  }
  const inverse = SPACE_INVERSE.safeParse(row.inverse).data;
  if (
    inverse === undefined ||
    !(await reverse({ tx, user, questId }, inverse))
  ) {
    return "unchanged";
  }
  const ids = new Set<string>([spaceId]);
  for (const side of [inverse.before, inverse.after]) {
    if (side !== undefined) {
      ids.add(side.spaceId);
    }
  }
  // A cross-space move leaves the same inverse in both spaces.
  await tx
    .update(spaceChanges)
    .set({ inverse: null })
    .where(
      and(
        inArray(spaceChanges.spaceId, [...ids]),
        sql`${spaceChanges.inverse} = ${JSON.stringify(inverse)}::jsonb`,
        spaceChangeOpenTo(user),
      ),
    );
  await tx
    .update(spaces)
    .set({ version: sql`${spaces.version} + 1` })
    .where(and(inArray(spaces.id, [...ids]), spaceOpenTo(user)));
  return "saved";
}

export type { Inverse };
export { CHECK_OFF, SPACE_INVERSE, undoSpaceChange };
