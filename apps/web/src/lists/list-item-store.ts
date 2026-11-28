import { and, eq, inArray, sql } from "drizzle-orm";
import {
  listItemOpenTo,
  listOpenTo,
  questOpenTo,
} from "@/accounts/owner-scope.ts";
import { getDb, inTransaction, type Transaction } from "@/db/client.ts";
import { expireReads } from "@/db/read-cache.ts";
import { listChanges } from "@/db/tables/list-changes.ts";
import { listItems, lists } from "@/db/tables/lists.ts";
import { quests } from "@/db/tables/quests.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import {
  latestCheckOff,
  recordEvents,
  takeBackEvents,
} from "@/experience/experience-store.ts";
import type { QuestId, UserId } from "@/ids.ts";
import { keepQuestReadToday } from "@/quests/quest-reads.ts";
import type { Cadence } from "@/streaks/streaks.ts";
import {
  LIST_ID,
  LIST_TYPE,
  type ListId,
  type ListType,
  listItemText,
} from "./list.ts";
import { LIST_ITEM_ID, type ListItemChange } from "./list-item.ts";
import { type List, readList } from "./list-store.ts";
import {
  CHECK_OFF,
  type Inverse,
  LIST_INVERSE,
  undoListChange,
} from "./list-undo.ts";
import {
  CHECKED_OFF_NOW,
  checkedOffOn,
  LIST_ITEM_COLUMNS,
} from "./quest-today.ts";
import { retype } from "./retype.ts";

type Row = typeof listItems.$inferSelect;

function toListItem(row: Row): {
  id: ReturnType<typeof LIST_ITEM_ID.parse>;
  text: string;
  taskNumber: number | null;
  checkedOff: boolean;
  recurring: boolean;
  cadence: Cadence;
  createdAt: Date;
} {
  return {
    id: LIST_ITEM_ID.parse(row.id),
    text: row.text,
    taskNumber: row.taskNumber,
    checkedOff: row.checkedOff,
    recurring: row.recurring,
    cadence: row.cadence,
    createdAt: row.createdAt,
  };
}

type ListItem = ReturnType<typeof toListItem>;

type ChangeResult = "saved" | "missing" | "invalid-text" | "unchanged";
type ForwardChange = Exclude<ListItemChange, { kind: "undo" }>;

function listRows(
  tx: Transaction | ReturnType<typeof getDb>,
  user: UserId,
  questId: QuestId,
  listId: ListId,
): Promise<Row[]> {
  return Promise.resolve(
    tx
      .select(LIST_ITEM_COLUMNS)
      .from(listItems)
      .where(
        and(
          eq(listItems.questId, questId),
          eq(listItems.listId, listId),
          listItemOpenTo(user),
        ),
      )
      .orderBy(listItems.position, listItems.id),
  );
}

async function readListItems(
  user: UserId,
  questId: QuestId,
  listId: ListId,
): Promise<ListItem[]> {
  "use cache";
  await keepQuestReadToday(user, questId);
  return await withAppErrors("readListItems", async () =>
    (await listRows(getDb(), user, questId, listId)).map(toListItem),
  );
}

interface ListWrite {
  readonly tx: Transaction;
  readonly user: UserId;
  readonly questId: QuestId;
  readonly listId: ListId;
  readonly nextTaskNumber: number;
  readonly atTop: boolean;
  readonly type: ListType;
}

// The quest's next count task numbers, in order, taken so no other task
// gets them.
async function takeTaskNumbers(
  { tx, user, questId, nextTaskNumber }: ListWrite,
  count: number,
): Promise<number[]> {
  await tx
    .update(quests)
    .set({ nextTaskNumber: nextTaskNumber + count })
    .where(and(eq(quests.id, questId), questOpenTo(user)));
  return Array.from({ length: count }, (_, offset) => nextTaskNumber + offset);
}

async function applyChange(
  write: ListWrite,
  rows: readonly Row[],
  change: ForwardChange,
  index: number,
): Promise<ChangeResult> {
  const { tx, user, questId, listId, type } = write;
  if (change.kind === "add") {
    const text = listItemText(type).safeParse(change.text).data;
    if (text === undefined) {
      return "invalid-text";
    }
    let taskNumber: number | null = null;
    if (type === "task") {
      [taskNumber = null] = await takeTaskNumbers(write, 1);
    }
    let position = (rows.at(-1)?.position ?? -1) + 1;
    if (write.atTop) {
      position = (rows[0]?.position ?? 1) - 1;
    }
    const [added] = await tx
      .insert(listItems)
      .values({
        questId,
        listId,
        text,
        taskNumber,
        position,
      })
      .returning({ id: listItems.id });
    if (added === undefined) {
      throw new Error("Inserting a list item returned no list item");
    }
    await recordEvents(tx, { user, questId }, "adding", [added.id]);
    return "saved";
  }
  const row = rows[index];
  if (row === undefined) {
    return "missing";
  }
  return applyExisting(write, { rows, index, row }, change);
}

// The row's text becomes the first of texts, and the rest become new list
// items right after it. A new task takes the next task numbers and repeats
// as the row does, unchecked.
async function split(
  write: ListWrite,
  row: Row,
  texts: readonly string[],
): Promise<"saved" | "invalid-text"> {
  const { tx, user, questId, listId, type } = write;
  const parts = listItemText(type).array().safeParse(texts).data;
  const [first, ...rest] = parts ?? [];
  if (first === undefined) {
    return "invalid-text";
  }
  await tx
    .update(listItems)
    .set({ text: first })
    .where(and(eq(listItems.id, row.id), listItemOpenTo(user)));
  await tx
    .update(listItems)
    .set({ position: sql`${listItems.position} + ${rest.length}::integer` })
    .where(
      and(
        eq(listItems.listId, listId),
        sql`${listItems.position} > ${row.position}::integer`,
        listItemOpenTo(user),
      ),
    );
  let numbers: readonly number[] = [];
  if (type === "task") {
    numbers = await takeTaskNumbers(write, rest.length);
  }
  const added = await tx
    .insert(listItems)
    .values(
      rest.map((text, offset) => ({
        questId,
        listId,
        text,
        taskNumber: numbers[offset] ?? null,
        position: row.position + 1 + offset,
        recurring: row.recurring,
        cadence: row.cadence,
      })),
    )
    .returning({ id: listItems.id });
  await recordEvents(
    tx,
    { user, questId },
    "adding",
    added.map(({ id }) => id),
  );
  return "saved";
}

async function applyExisting(
  write: ListWrite,
  {
    rows,
    index,
    row,
  }: {
    readonly rows: readonly Row[];
    readonly index: number;
    readonly row: Row;
  },
  change: Exclude<ForwardChange, { kind: "add" }>,
): Promise<ChangeResult> {
  const { tx, user, questId, listId } = write;
  const target = and(eq(listItems.id, row.id), listItemOpenTo(user));
  switch (change.kind) {
    case "edit": {
      const text = listItemText(write.type).safeParse(change.text).data;
      if (text === undefined) {
        return "invalid-text";
      }
      if (text === row.text) {
        return "unchanged";
      }
      await tx.update(listItems).set({ text }).where(target);
      return "saved";
    }
    case "split":
      return split(write, row, change.texts);
    case "check":
      if (write.type !== "task" || change.checkedOff === row.checkedOff) {
        return "unchanged";
      }
      if (change.checkedOff) {
        await recordEvents(tx, { user, questId }, "checking-off", [
          String(row.taskNumber),
        ]);
      } else {
        await takeBackEvents(tx, "checking-off", questId, [
          String(row.taskNumber),
        ]);
      }
      await tx
        .update(listItems)
        .set({
          checkedOff: change.checkedOff,
          checkedOffOn: checkedOffOn(change),
        })
        .where(target);
      return "saved";
    case "recurring": {
      const recurring = change.cadence !== null;
      const cadence = change.cadence ?? row.cadence;
      if (
        write.type !== "task" ||
        (row.recurring === recurring && row.cadence === cadence)
      ) {
        return "unchanged";
      }
      await tx.update(listItems).set({ recurring, cadence }).where(target);
      return "saved";
    }
    case "remove":
      await tx.delete(listItems).where(target);
      return "saved";
    case "move": {
      if (change.destination === listId) {
        return "unchanged";
      }
      const [destination] = await tx
        .select({ type: lists.type })
        .from(lists)
        .where(
          and(
            eq(lists.id, change.destination),
            eq(lists.questId, questId),
            listOpenTo(user),
          ),
        );
      if (destination === undefined) {
        return "missing";
      }
      const retyped = await retype(tx, { user, questId }, [row], {
        from: write.type,
        to: LIST_TYPE.parse(destination.type),
      });
      if (retyped !== "saved") {
        return retyped;
      }
      const destinationRows = await listRows(
        tx,
        user,
        questId,
        change.destination,
      );
      await tx
        .update(listItems)
        .set({
          listId: change.destination,
          position: (destinationRows.at(-1)?.position ?? -1) + 1,
        })
        .where(target);
      return "saved";
    }
    case "place": {
      const reordered = rows.filter(({ id }) => id !== row.id);
      let before = reordered.length;
      if (change.before !== undefined) {
        before = reordered.findIndex(({ id }) => id === change.before);
        if (before < 0) {
          return "missing";
        }
      }
      if (before === index) {
        return "unchanged";
      }
      reordered.splice(before, 0, row);
      const positions = sql.join(
        reordered.map(
          (item, position) =>
            sql`when ${item.id}::uuid then ${position}::integer`,
        ),
        sql` `,
      );
      await tx
        .update(listItems)
        .set({ position: sql`case ${listItems.id} ${positions} end` })
        .where(and(eq(listItems.listId, listId), listItemOpenTo(user)));
      return "saved";
    }
    default: {
      const exhaustive: never = change;
      return exhaustive;
    }
  }
}

async function captureCheckOff(
  tx: Transaction,
  questId: QuestId,
  row: Row | undefined,
  change: ForwardChange,
): Promise<Inverse["checkOff"]> {
  if (
    (change.kind === "check" || change.kind === "move") &&
    row !== undefined &&
    row.taskNumber !== null
  ) {
    const event = await latestCheckOff(tx, questId, row.taskNumber);
    if (event !== undefined) {
      return CHECK_OFF.parse(event);
    }
  }
  return undefined;
}

async function captureBeforeChange(
  write: ListWrite,
  rows: readonly Row[],
  change: ForwardChange,
): Promise<{
  readonly index: number;
  readonly before: Row | undefined;
  readonly neighbour: string | undefined;
  readonly checkOff: Inverse["checkOff"];
}> {
  let index = -1;
  let neighbour: string | undefined;
  if (change.kind !== "add") {
    index = rows.findIndex(({ id }) => id === change.id);
    if (index >= 0) {
      neighbour = rows[index + 1]?.id;
    }
  }
  const before = rows[index];
  // Check-off and move can change the event that undo needs to restore.
  const checkOff = await captureCheckOff(
    write.tx,
    write.questId,
    before,
    change,
  );
  return { index, before, neighbour, checkOff };
}

async function inverseFor(
  write: ListWrite,
  rows: readonly Row[],
  change: ForwardChange,
): Promise<{ readonly result: ChangeResult; readonly inverse?: Inverse }> {
  const { tx, user, questId, listId } = write;
  const { index, before, neighbour, checkOff } = await captureBeforeChange(
    write,
    rows,
    change,
  );
  const result = await applyChange(write, rows, change, index);
  if (result !== "saved") {
    return { result };
  }
  let destination = listId;
  if (change.kind === "move") {
    ({ destination } = change);
  }
  const saved = await listRows(tx, user, questId, destination);
  const previous = new Set(rows.map(({ id }) => id));
  const added = saved.filter(({ id }) => !previous.has(id));
  let after = saved.find(({ id }) => id === before?.id);
  if (change.kind === "add") {
    [after] = added;
  }
  let parts: Row[] | undefined;
  if (change.kind === "split") {
    parts = added;
  }
  const checkOffAfter = await captureCheckOff(tx, questId, after, change);
  return {
    result,
    inverse: LIST_INVERSE.parse({
      kind: change.kind,
      before,
      after,
      added: parts,
      neighbour,
      checkOff,
      checkOffAfter,
    }),
  };
}

async function changeWithin(
  tx: Transaction,
  user: UserId,
  {
    questId,
    listId,
    activeOnly = false,
    atTop = false,
  }: {
    readonly questId: QuestId;
    readonly listId: ListId;
    readonly activeOnly?: boolean;
    readonly atTop?: boolean;
  },
  change: ListItemChange,
): Promise<ChangeResult> {
  const [quest] = await tx
    .select({
      nextTaskNumber: quests.nextTaskNumber,
      status: quests.status,
    })
    .from(quests)
    .where(and(eq(quests.id, questId), questOpenTo(user)))
    .for("update");
  if (
    quest === undefined ||
    (activeOnly === true && quest.status !== "active")
  ) {
    return "missing";
  }
  const [list] = await tx
    .select({ type: lists.type })
    .from(lists)
    .where(
      and(eq(lists.questId, questId), eq(lists.id, listId), listOpenTo(user)),
    );
  if (list === undefined) {
    return "missing";
  }
  if (change.kind === "undo") {
    return undoListChange(tx, user, { questId, listId }, change.version);
  }
  const rows = await listRows(tx, user, questId, listId);
  const { result, inverse } = await inverseFor(
    {
      tx,
      user,
      questId,
      listId,
      atTop,
      nextTaskNumber: quest.nextTaskNumber,
      type: LIST_TYPE.parse(list.type),
    },
    rows,
    change,
  );
  if (inverse !== undefined) {
    const changed = [listId];
    if (change.kind === "move") {
      changed.push(change.destination);
    }
    const versions = await tx
      .update(lists)
      .set({ version: sql`${lists.version} + 1` })
      .where(and(inArray(lists.id, changed), listOpenTo(user)))
      .returning({ listId: lists.id, version: lists.version });
    await tx
      .insert(listChanges)
      .values(versions.map((version) => ({ ...version, inverse })));
  }
  return result;
}

interface ListContents extends List {
  readonly listItems: readonly ListItem[];
}

async function listContents(
  db: ReturnType<typeof getDb>,
  user: UserId,
  questId: QuestId,
  listId: ListId,
): Promise<ListContents | undefined> {
  const list = await readList(db, user, questId, listId);
  if (list === undefined) {
    return undefined;
  }
  const rows = await listRows(db, user, questId, listId);
  return { ...list, listItems: rows.map(toListItem) };
}

async function readListContents(
  user: UserId,
  questId: QuestId,
  listId: ListId,
): Promise<ListContents | undefined> {
  "use cache";
  await keepQuestReadToday(user, questId);
  return await withAppErrors("readListContents", () =>
    listContents(getDb(), user, questId, listId),
  );
}

async function writeListContents(
  user: UserId,
  questId: QuestId,
  listId: ListId,
  change: ListItemChange,
): Promise<{
  readonly result: ChangeResult;
  readonly list?: ListContents | undefined;
}> {
  const written = await withAppErrors("writeListContents", () =>
    inTransaction(async (tx) => {
      const result = await changeWithin(tx, user, { questId, listId }, change);
      if (result !== "saved") {
        return { result };
      }
      return { result, list: await listContents(tx, user, questId, listId) };
    }),
  );
  expireReads({ accounts: [user], quests: [questId] });
  return written;
}

// Adds to a list of an active quest, at the top, as quick add does.
async function quickAdd(
  user: UserId,
  target: { readonly questId: QuestId; readonly listId: ListId },
  text: string,
): Promise<ChangeResult> {
  const result = await withAppErrors("quickAdd", () =>
    inTransaction((tx) =>
      changeWithin(
        tx,
        user,
        { ...target, activeOnly: true, atTop: true },
        { kind: "add", text },
      ),
    ),
  );
  expireReads({ accounts: [user], quests: [target.questId] });
  return result;
}

// An open task with the list it is in.
interface OpenTask extends ListItem {
  readonly listId: ListId;
}

// The quest's next tasks, up to count of them: its open tasks, taking its
// task lists in order and each list's tasks in their saved order. The first
// is the quest's next task.
async function readNextTasks(
  user: UserId,
  questId: QuestId,
  count: number,
): Promise<OpenTask[]> {
  "use cache";
  await keepQuestReadToday(user, questId);
  return await withAppErrors("readNextTasks", async () => {
    const rows = await getDb()
      .select({ item: LIST_ITEM_COLUMNS })
      .from(listItems)
      .innerJoin(lists, eq(lists.id, listItems.listId))
      .where(
        and(
          eq(listItems.questId, questId),
          listItemOpenTo(user),
          listOpenTo(user),
          eq(lists.type, "task"),
          sql`not ${CHECKED_OFF_NOW}`,
        ),
      )
      .orderBy(lists.position, listItems.position, listItems.id)
      .limit(count);
    return rows.map(({ item }) => ({
      ...toListItem(item),
      listId: LIST_ID.parse(item.listId),
    }));
  });
}

export type { ListItem, OpenTask };
export {
  changeWithin,
  quickAdd,
  readListContents,
  readListItems,
  readNextTasks,
  writeListContents,
};
