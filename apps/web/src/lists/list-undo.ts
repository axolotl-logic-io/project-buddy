import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import {
  listChangeOpenTo,
  listItemOpenTo,
  listOpenTo,
} from "@/accounts/owner-scope.ts";
import type { Transaction } from "@/db/client.ts";
import { events } from "@/db/tables/events.ts";
import { listChanges } from "@/db/tables/list-changes.ts";
import { listItems, lists } from "@/db/tables/lists.ts";
import { users } from "@/db/tables/users.ts";
import { QUEST_ID, type QuestId, USER_ID, type UserId } from "@/ids.ts";
import type { ListId } from "./list.ts";
import { LIST_ITEM_ID } from "./list-item.ts";
import { LIST_ITEM_RECORD } from "./list-item-record.ts";
import { LIST_ITEM_COLUMNS } from "./quest-today.ts";

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

const LIST_INVERSE = z.object({
  kind: z.enum([
    "add",
    "edit",
    "check",
    "recurring",
    "remove",
    "move",
    "place",
    "reorder",
  ]),
  before: LIST_ITEM_RECORD.optional(),
  after: LIST_ITEM_RECORD.optional(),
  neighbour: LIST_ITEM_ID.optional(),
  checkOff: CHECK_OFF.optional(),
  checkOffAfter: CHECK_OFF.optional(),
});

type Inverse = z.infer<typeof LIST_INVERSE>;
type SavedRow = z.infer<typeof LIST_ITEM_RECORD>;
type Row = typeof listItems.$inferSelect;
// A record's check-off as it was saved, which the effective checkedOff
// overrides on a recurring task checked off before today.
function savedCheckOff(
  row: SavedRow,
): Pick<Row, "checkedOff" | "checkedOffOn"> {
  return { checkedOff: row.checkedOff, checkedOffOn: row.checkedOffOn };
}
interface Scope {
  readonly tx: Transaction;
  readonly user: UserId;
  readonly questId: QuestId;
}

async function undoCheckOff(
  { tx, questId }: Scope,
  { after, checkOff, checkOffAfter }: Inverse,
): Promise<void> {
  if (checkOffAfter?.id === checkOff?.id) {
    return;
  }
  if (after?.checkedOff === true && checkOffAfter !== undefined) {
    await tx
      .delete(events)
      .where(and(eq(events.id, checkOffAfter.id), eq(events.questId, questId)));
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
  listId: ListId,
  neighbour?: SavedRow["id"],
): Promise<number> {
  const scope = and(
    eq(listItems.questId, questId),
    eq(listItems.listId, listId),
    listItemOpenTo(user),
  );
  if (neighbour !== undefined) {
    const [anchor] = await tx
      .select({ position: listItems.position })
      .from(listItems)
      .where(and(scope, eq(listItems.id, neighbour)));
    if (anchor !== undefined) {
      await tx
        .update(listItems)
        .set({ position: sql`${listItems.position} + 1` })
        .where(and(scope, sql`${listItems.position} >= ${anchor.position}`));
      return anchor.position;
    }
  }
  const [last] = await tx
    .select({ position: listItems.position })
    .from(listItems)
    .where(scope)
    .orderBy(desc(listItems.position))
    .limit(1);
  return (last?.position ?? -1) + 1;
}

function sameTask(a: Row, b: SavedRow): boolean {
  return (
    a.taskNumber === b.taskNumber &&
    a.checkedOff === b.checkedOff &&
    a.recurring === b.recurring &&
    a.cadence === b.cadence
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
  const target = and(eq(listItems.id, current.id), listItemOpenTo(user));
  switch (inverse.kind) {
    case "edit":
      if (current.text !== after.text) {
        return false;
      }
      await tx.update(listItems).set({ text: before.text }).where(target);
      return true;
    case "check":
      if (
        current.taskNumber !== after.taskNumber ||
        current.checkedOff !== after.checkedOff
      ) {
        return false;
      }
      await tx.update(listItems).set(savedCheckOff(before)).where(target);
      await undoCheckOff(scope, inverse);
      return true;
    case "recurring":
      if (
        current.taskNumber !== after.taskNumber ||
        current.recurring !== after.recurring ||
        current.cadence !== after.cadence
      ) {
        return false;
      }
      await tx
        .update(listItems)
        .set({ recurring: before.recurring, cadence: before.cadence })
        .where(target);
      return true;
    case "move":
    case "place":
    case "reorder": {
      if (
        current.listId !== after.listId ||
        current.position !== after.position ||
        !sameTask(current, after)
      ) {
        return false;
      }
      const position = await restoredPosition(
        scope,
        before.listId,
        inverse.neighbour,
      );
      await tx
        .update(listItems)
        .set({
          listId: before.listId,
          position,
          taskNumber: before.taskNumber,
          ...savedCheckOff(before),
          recurring: before.recurring,
          cadence: before.cadence,
        })
        .where(target);
      // A move to a list of another type changed the item's type.
      await undoCheckOff(scope, inverse);
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
    eq(listItems.id, id),
    eq(listItems.questId, questId),
    listItemOpenTo(user),
  );
  const [current] = await tx
    .select(LIST_ITEM_COLUMNS)
    .from(listItems)
    .where(target);
  if (after === undefined && before !== undefined && current === undefined) {
    const position = await restoredPosition(
      scope,
      before.listId,
      inverse.neighbour,
    );
    await tx.insert(listItems).values({ ...before, position });
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
    !sameTask(current, after) ||
    current.listId !== after.listId
  ) {
    return false;
  }
  await tx.delete(listItems).where(target);
  return true;
}

async function undoListChange(
  tx: Transaction,
  user: UserId,
  { questId, listId }: { readonly questId: QuestId; readonly listId: ListId },
  version: number,
): Promise<"saved" | "missing" | "unchanged"> {
  const [row] = await tx
    .select({ inverse: listChanges.inverse })
    .from(listChanges)
    .where(
      and(
        eq(listChanges.listId, listId),
        eq(listChanges.version, version),
        listChangeOpenTo(user),
      ),
    );
  if (row === undefined) {
    return "missing";
  }
  const inverse = LIST_INVERSE.safeParse(row.inverse).data;
  if (
    inverse === undefined ||
    !(await reverse({ tx, user, questId }, inverse))
  ) {
    return "unchanged";
  }
  const ids = new Set<string>([listId]);
  for (const side of [inverse.before, inverse.after]) {
    if (side !== undefined) {
      ids.add(side.listId);
    }
  }
  // A cross-list move leaves the same inverse in both lists.
  await tx
    .update(listChanges)
    .set({ inverse: null })
    .where(
      and(
        inArray(listChanges.listId, [...ids]),
        sql`${listChanges.inverse} = ${JSON.stringify(inverse)}::jsonb`,
        listChangeOpenTo(user),
      ),
    );
  await tx
    .update(lists)
    .set({ version: sql`${lists.version} + 1` })
    .where(and(inArray(lists.id, [...ids]), listOpenTo(user)));
  return "saved";
}

export type { Inverse };
export { CHECK_OFF, LIST_INVERSE, undoListChange };
