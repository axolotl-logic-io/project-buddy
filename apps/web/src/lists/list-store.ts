import { and, desc, eq } from "drizzle-orm";
import {
  listChangeOpenTo,
  listItemOpenTo,
  listOpenTo,
  questOpenTo,
} from "@/accounts/owner-scope.ts";
import {
  type Database,
  getDb,
  inTransaction,
  type Transaction,
} from "@/db/client.ts";
import { listChanges } from "@/db/tables/list-changes.ts";
import { listItems, lists } from "@/db/tables/lists.ts";
import { questDays } from "@/db/tables/quest-days.ts";
import { quests } from "@/db/tables/quests.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import type { QuestId, UserId } from "@/ids.ts";
import {
  LIST_ID,
  LIST_SETTINGS,
  type ListId,
  type ListSettings,
  STARTING_LISTS,
} from "./list.ts";
import { retype } from "./retype.ts";

interface List extends ListSettings {
  readonly id: ListId;
  readonly position: number;
  readonly version: number;
}

function toList(row: typeof lists.$inferSelect): List {
  return {
    ...LIST_SETTINGS.parse(row),
    id: LIST_ID.parse(row.id),
    position: row.position,
    version: row.version,
  };
}

async function seedLists(tx: Transaction, questId: QuestId): Promise<void> {
  await tx.insert(lists).values(
    STARTING_LISTS.map((settings, position) => ({
      ...settings,
      questId,
      position,
    })),
  );
}

function readLists(user: UserId, questId: QuestId): Promise<List[]> {
  return withAppErrors("readLists", async () => {
    const rows = await getDb()
      .select()
      .from(lists)
      .where(and(eq(lists.questId, questId), listOpenTo(user)))
      .orderBy(lists.position);
    return rows.map(toList);
  });
}

async function readList(
  db: Database,
  user: UserId,
  questId: QuestId,
  listId: ListId,
): Promise<List | undefined> {
  const [row] = await db
    .select()
    .from(lists)
    .where(
      and(eq(lists.questId, questId), eq(lists.id, listId), listOpenTo(user)),
    );
  if (row === undefined) {
    return undefined;
  }
  return toList(row);
}

function saveList(
  user: UserId,
  questId: QuestId,
  settings: ListSettings,
  listId?: ListId,
): Promise<List | "invalid-text" | undefined> {
  return withAppErrors("saveList", () =>
    inTransaction(async (tx) => {
      const [quest] = await tx
        .select({ id: quests.id })
        .from(quests)
        .where(and(eq(quests.id, questId), questOpenTo(user)))
        .for("update");
      if (quest === undefined) {
        return;
      }
      if (listId !== undefined) {
        const current = await readList(tx, user, questId, listId);
        if (current === undefined) {
          return;
        }
        const items = await tx
          .select()
          .from(listItems)
          .where(and(eq(listItems.listId, listId), listItemOpenTo(user)));
        const retyped = await retype(tx, { user, questId }, items, {
          from: current.type,
          to: settings.type,
        });
        if (retyped !== "saved") {
          return retyped;
        }
        if (current.type !== settings.type) {
          // Undoing an earlier change, or the start of the day, would bring
          // back items of the old type.
          await tx
            .update(listChanges)
            .set({ inverse: null })
            .where(and(eq(listChanges.listId, listId), listChangeOpenTo(user)));
          await tx
            .update(questDays)
            .set({ undo: null })
            .where(eq(questDays.questId, questId));
        }
        const [updated] = await tx
          .update(lists)
          .set(settings)
          .where(
            and(
              eq(lists.questId, questId),
              eq(lists.id, listId),
              listOpenTo(user),
            ),
          )
          .returning();
        if (updated !== undefined) {
          return toList(updated);
        }
        return;
      }
      const [last] = await tx
        .select({ position: lists.position })
        .from(lists)
        .where(and(eq(lists.questId, questId), listOpenTo(user)))
        .orderBy(desc(lists.position))
        .limit(1);
      const [added] = await tx
        .insert(lists)
        .values({ ...settings, questId, position: (last?.position ?? -1) + 1 })
        .returning();
      if (added === undefined) {
        throw new Error("Inserting a list returned no list");
      }
      return toList(added);
    }),
  );
}

export type { List };
export { readList, readLists, saveList, seedLists };
