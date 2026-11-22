import { and, eq, inArray, sql } from "drizzle-orm";
import {
  murmlingOpenTo,
  questOpenTo,
  spaceOpenTo,
} from "@/accounts/owner-scope.ts";
import { getDb, inTransaction, type Transaction } from "@/db/client.ts";
import { quests } from "@/db/tables/quests-and-chats.ts";
import { murmlings, spaces } from "@/db/tables/spaces.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { gainPoints, losePoints } from "@/experience/experience-store.ts";
import type { QuestId, UserId } from "@/ids.ts";
import { MURMLING_ID, type MurmlingChange } from "./murmling.ts";
import { MURMLING_TYPE, murmlingText, type SpaceId } from "./space.ts";

type Row = typeof murmlings.$inferSelect;

function toMurmling(row: Row): {
  id: ReturnType<typeof MURMLING_ID.parse>;
  type: ReturnType<typeof MURMLING_TYPE.parse>;
  text: string;
  taskNumber: number | null;
  checkedOff: boolean;
  recurring: boolean;
  createdAt: Date;
} {
  return {
    id: MURMLING_ID.parse(row.id),
    type: MURMLING_TYPE.parse(row.type),
    text: row.text,
    taskNumber: row.taskNumber,
    checkedOff: row.checkedOff,
    recurring: row.recurring,
    createdAt: row.createdAt,
  };
}

type Murmling = ReturnType<typeof toMurmling>;

type ChangeResult = "saved" | "missing" | "invalid-text" | "unchanged";

function spaceRows(
  tx: Transaction | ReturnType<typeof getDb>,
  user: UserId,
  questId: QuestId,
  spaceId: SpaceId,
): Promise<Row[]> {
  return Promise.resolve(
    tx
      .select()
      .from(murmlings)
      .where(
        and(
          eq(murmlings.questId, questId),
          eq(murmlings.spaceId, spaceId),
          murmlingOpenTo(user),
        ),
      )
      .orderBy(murmlings.position, murmlings.id),
  );
}

function listMurmlings(
  user: UserId,
  questId: QuestId,
  spaceId: SpaceId,
): Promise<Murmling[]> {
  return withAppErrors("listMurmlings", async () =>
    (await spaceRows(getDb(), user, questId, spaceId)).map(toMurmling),
  );
}

interface SpaceWrite {
  readonly tx: Transaction;
  readonly user: UserId;
  readonly questId: QuestId;
  readonly spaceId: SpaceId;
  readonly nextTaskNumber: number;
  readonly atTop: boolean;
}

async function takeTaskNumber({
  tx,
  user,
  questId,
  nextTaskNumber,
}: SpaceWrite): Promise<number> {
  await tx
    .update(quests)
    .set({ nextTaskNumber: nextTaskNumber + 1 })
    .where(and(eq(quests.id, questId), questOpenTo(user)));
  return nextTaskNumber;
}

async function applyChange(
  write: SpaceWrite,
  rows: readonly Row[],
  newType: string,
  change: MurmlingChange,
): Promise<ChangeResult> {
  const { tx, user, questId, spaceId } = write;
  if (change.kind === "add") {
    const type = change.type ?? MURMLING_TYPE.parse(newType);
    const text = murmlingText(type).safeParse(change.text).data;
    if (text === undefined) {
      return "invalid-text";
    }
    let taskNumber: number | null = null;
    if (type === "task") {
      taskNumber = await takeTaskNumber(write);
    }
    let position = (rows.at(-1)?.position ?? -1) + 1;
    if (write.atTop) {
      position = (rows[0]?.position ?? 1) - 1;
    }
    const [added] = await tx
      .insert(murmlings)
      .values({
        questId,
        spaceId,
        type,
        text,
        taskNumber,
        position,
      })
      .returning({ id: murmlings.id });
    if (added === undefined) {
      throw new Error("Inserting a murmling returned no murmling");
    }
    await gainPoints(tx, { user, questId }, "adding-tasks", [added.id]);
    return "saved";
  }
  const index = rows.findIndex(({ id }) => id === change.id);
  const row = rows.at(index);
  if (index < 0 || row === undefined) {
    return "missing";
  }
  return applyExisting(write, { rows, index, row }, change);
}

async function applyExisting(
  write: SpaceWrite,
  {
    rows,
    index,
    row,
  }: {
    readonly rows: readonly Row[];
    readonly index: number;
    readonly row: Row;
  },
  change: Exclude<MurmlingChange, { kind: "add" }>,
): Promise<ChangeResult> {
  const { tx, user, questId, spaceId } = write;
  const target = and(eq(murmlings.id, row.id), murmlingOpenTo(user));
  switch (change.kind) {
    case "edit": {
      const text = murmlingText(MURMLING_TYPE.parse(row.type)).safeParse(
        change.text,
      ).data;
      if (text === undefined) {
        return "invalid-text";
      }
      if (text === row.text) {
        return "unchanged";
      }
      await tx.update(murmlings).set({ text }).where(target);
      return "saved";
    }
    case "type": {
      if (change.type === row.type) {
        return "unchanged";
      }
      if (!murmlingText(change.type).safeParse(row.text).success) {
        return "invalid-text";
      }
      if (row.checkedOff) {
        await losePoints(tx, "completing-tasks", questId, [
          String(row.taskNumber),
        ]);
      }
      let taskNumber: number | null = null;
      if (change.type === "task") {
        taskNumber = await takeTaskNumber(write);
      }
      await tx
        .update(murmlings)
        .set({
          type: change.type,
          taskNumber,
          checkedOff: false,
          recurring: false,
        })
        .where(target);
      return "saved";
    }
    case "check":
      if (row.type !== "task" || change.checkedOff === row.checkedOff) {
        return "unchanged";
      }
      if (change.checkedOff) {
        await gainPoints(tx, { user, questId }, "completing-tasks", [
          String(row.taskNumber),
        ]);
      } else {
        await losePoints(tx, "completing-tasks", questId, [
          String(row.taskNumber),
        ]);
      }
      await tx
        .update(murmlings)
        .set({ checkedOff: change.checkedOff })
        .where(target);
      return "saved";
    case "remove":
      await tx.delete(murmlings).where(target);
      return "saved";
    case "move": {
      if (change.destination === spaceId) {
        return "unchanged";
      }
      const [destination] = await tx
        .select({ id: spaces.id })
        .from(spaces)
        .where(
          and(
            eq(spaces.id, change.destination),
            eq(spaces.questId, questId),
            spaceOpenTo(user),
          ),
        );
      if (destination === undefined) {
        return "missing";
      }
      const destinationRows = await spaceRows(
        tx,
        user,
        questId,
        change.destination,
      );
      await tx
        .update(murmlings)
        .set({
          spaceId: change.destination,
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
        .update(murmlings)
        .set({ position: sql`case ${murmlings.id} ${positions} end` })
        .where(and(eq(murmlings.spaceId, spaceId), murmlingOpenTo(user)));
      return "saved";
    }
    case "reorder": {
      let neighbourIndex = index + 1;
      if (change.direction === "up") {
        neighbourIndex = index - 1;
      }
      const neighbour = rows[neighbourIndex];
      if (neighbour === undefined) {
        return "unchanged";
      }
      await tx
        .update(murmlings)
        .set({
          position: sql`case when ${murmlings.id} = ${row.id} then ${neighbour.position}::integer else ${row.position}::integer end`,
        })
        .where(
          and(
            inArray(murmlings.id, [row.id, neighbour.id]),
            murmlingOpenTo(user),
          ),
        );
      return "saved";
    }
    default: {
      const exhaustive: never = change;
      return exhaustive;
    }
  }
}

async function changeWithin(
  tx: Transaction,
  user: UserId,
  {
    questId,
    spaceId,
    activeOnly = false,
    atTop = false,
  }: {
    readonly questId: QuestId;
    readonly spaceId: SpaceId;
    readonly activeOnly?: boolean;
    readonly atTop?: boolean;
  },
  change: MurmlingChange,
): Promise<ChangeResult> {
  const [quest] = await tx
    .select({ nextTaskNumber: quests.nextTaskNumber, status: quests.status })
    .from(quests)
    .where(and(eq(quests.id, questId), questOpenTo(user)))
    .for("update");
  if (
    quest === undefined ||
    (activeOnly === true && quest.status !== "active")
  ) {
    return "missing";
  }
  const [space] = await tx
    .select({ newType: spaces.newType })
    .from(spaces)
    .where(
      and(
        eq(spaces.questId, questId),
        eq(spaces.id, spaceId),
        spaceOpenTo(user),
      ),
    );
  if (space === undefined) {
    return "missing";
  }
  const rows = await spaceRows(tx, user, questId, spaceId);
  const result = await applyChange(
    { tx, user, questId, spaceId, atTop, nextTaskNumber: quest.nextTaskNumber },
    rows,
    space.newType,
    change,
  );
  if (result === "saved") {
    const changed = [spaceId];
    if (change.kind === "move") {
      changed.push(change.destination);
    }
    await tx
      .update(spaces)
      .set({ version: sql`${spaces.version} + 1` })
      .where(and(inArray(spaces.id, changed), spaceOpenTo(user)));
  }
  return result;
}

function changeMurmling(
  user: UserId,
  questId: QuestId,
  spaceId: SpaceId,
  change: MurmlingChange,
): Promise<ChangeResult> {
  return withAppErrors("changeMurmling", () =>
    inTransaction((tx) => changeWithin(tx, user, { questId, spaceId }, change)),
  );
}

export type { Murmling };
export { changeMurmling, changeWithin, listMurmlings };
