// Giving list items a new type: when a list's type changes, or an item
// moves to a list of another type. Every item in a list has the list's type.
import { and, eq, inArray, sql } from "drizzle-orm";
import { listItemOpenTo, questOpenTo } from "@/accounts/owner-scope.ts";
import type { Transaction } from "@/db/client.ts";
import { listItems } from "@/db/tables/lists.ts";
import { quests } from "@/db/tables/quests.ts";
import { takeBackEvents } from "@/experience/experience-store.ts";
import type { QuestId, UserId } from "@/ids.ts";
import { type ListType, listItemText } from "./list.ts";

interface RetypedRow {
  readonly id: string;
  readonly text: string;
  readonly taskNumber: number | null;
  readonly checkedOff: boolean;
}

// Gives the rows the type `to`, coming from a list of type `from`. A task
// keeps its task number, check-off and recurrence only while it stays a
// task; leaving the task type takes back the experience of a check-off
// that still counts (src/lists/quest-today.ts), and
// becoming a task takes a new task number. Answers "invalid-text", and
// changes nothing, when any row's text doesn't fit the new type.
async function retype(
  tx: Transaction,
  { user, questId }: { readonly user: UserId; readonly questId: QuestId },
  rows: readonly RetypedRow[],
  { from, to }: { readonly from: ListType; readonly to: ListType },
): Promise<"saved" | "invalid-text"> {
  if (from === to || rows.length === 0) {
    return "saved";
  }
  if (rows.some(({ text }) => !listItemText(to).safeParse(text).success)) {
    return "invalid-text";
  }
  const checkedOff = rows.flatMap(({ checkedOff: done, taskNumber }) => {
    if (done && taskNumber !== null) {
      return [String(taskNumber)];
    }
    return [];
  });
  await takeBackEvents(tx, "checking-off", questId, checkedOff);
  const ids = rows.map(({ id }) => id);
  const target = and(inArray(listItems.id, ids), listItemOpenTo(user));
  if (to !== "task") {
    await tx
      .update(listItems)
      .set({
        taskNumber: null,
        checkedOff: false,
        checkedOffOn: null,
        recurring: false,
      })
      .where(target);
    return "saved";
  }
  const [quest] = await tx
    .update(quests)
    .set({ nextTaskNumber: sql`${quests.nextTaskNumber} + ${rows.length}` })
    .where(and(eq(quests.id, questId), questOpenTo(user)))
    .returning({ next: quests.nextTaskNumber });
  if (quest === undefined) {
    throw new Error("Retyping list items found no quest");
  }
  const first = quest.next - rows.length;
  const numbers = sql.join(
    ids.map(
      (id, index) => sql`when ${id}::uuid then ${first + index}::integer`,
    ),
    sql` `,
  );
  await tx
    .update(listItems)
    .set({
      taskNumber: sql`case ${listItems.id} ${numbers} end`,
      checkedOff: false,
      checkedOffOn: null,
      recurring: false,
    })
    .where(target);
  return "saved";
}

export { retype };
