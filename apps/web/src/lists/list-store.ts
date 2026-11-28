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
import { expireReads } from "@/db/read-cache.ts";
import { listChanges } from "@/db/tables/list-changes.ts";
import { listItems, lists } from "@/db/tables/lists.ts";
import { quests } from "@/db/tables/quests.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import type { QuestId, UserId } from "@/ids.ts";
import { keepQuestRead } from "@/quests/quest-reads.ts";
import {
  ITEM_LIST_TYPE,
  LIST_ID,
  LIST_TYPE,
  type ListId,
  type ListSettings,
  type ListType,
  STARTING_LISTS,
} from "./list.ts";
import { LIST_ITEM_COLUMNS } from "./quest-today.ts";
import { retype } from "./retype.ts";

interface List {
  readonly id: ListId;
  readonly name: string;
  readonly type: ListType;
  readonly position: number;
  readonly version: number;
}

function toList(row: typeof lists.$inferSelect): List {
  return {
    name: row.name,
    type: LIST_TYPE.parse(row.type),
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

async function readLists(user: UserId, questId: QuestId): Promise<List[]> {
  "use cache";
  keepQuestRead(user, questId);
  return await withAppErrors("readLists", async () => {
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

async function saveList(
  user: UserId,
  questId: QuestId,
  settings: ListSettings,
  listId?: ListId,
): Promise<List | "invalid-text" | undefined> {
  const saved = await withAppErrors("saveList", () =>
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
        // A Zotero Collection list keeps its settings in src/zotero/.
        const from = ITEM_LIST_TYPE.safeParse(current?.type).data;
        if (current === undefined || from === undefined) {
          return;
        }
        const items = await tx
          .select(LIST_ITEM_COLUMNS)
          .from(listItems)
          .where(and(eq(listItems.listId, listId), listItemOpenTo(user)));
        const retyped = await retype(tx, { user, questId }, items, {
          from,
          to: settings.type,
        });
        if (retyped !== "saved") {
          return retyped;
        }
        if (current.type !== settings.type) {
          // Undoing an earlier change would bring back items of the old
          // type.
          await tx
            .update(listChanges)
            .set({ inverse: null })
            .where(and(eq(listChanges.listId, listId), listChangeOpenTo(user)));
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
  expireReads({ accounts: [user], quests: [questId] });
  return saved;
}

export type { List };
export { readList, readLists, saveList, seedLists };
