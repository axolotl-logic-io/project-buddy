// Zotero Collection lists in Postgres: each list's collection, settings and
// sync result, and the references it imported with their checkmarks.
// Everyone a quest is open to may read its Zotero Collection lists and mark
// their references; the rest is its owner's (src/accounts/owner-scope.ts).
// The sync (src/zotero/zotero-sync.ts) talks to Zotero between
// beginZoteroSync and finishZoteroSync, outside any transaction.
import { and, desc, eq, isNotNull, notInArray, sql } from "drizzle-orm";
import {
  listOpenTo,
  listOwnedBy,
  questOwnedBy,
  zoteroConnectionOwnedBy,
  zoteroListOpenTo,
  zoteroListOwnedBy,
  zoteroReferenceOpenTo,
  zoteroReferenceOwnedBy,
} from "@/accounts/owner-scope.ts";
import {
  type Database,
  getDb,
  inTransaction,
  type Transaction,
} from "@/db/client.ts";
import { lists } from "@/db/tables/lists.ts";
import { quests } from "@/db/tables/quests.ts";
import {
  zoteroConnections,
  zoteroLists,
  zoteroReferences,
} from "@/db/tables/zotero.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import type { QuestId, UserId } from "@/ids.ts";
import { LIST_ID, LIST_WORD, type ListId } from "@/lists/list.ts";
import type { List } from "@/lists/list-store.ts";
import { plainText } from "./works-cited.ts";
import {
  SYNC_RESULT,
  type SyncProblem,
  type SyncResult,
  UNAVAILABLE,
  type Unavailable,
  WORKS_CITED_ENTRY,
  type WorksCitedEntry,
  ZOTERO_REFERENCE_ID,
  type ZoteroReferenceId,
} from "./zotero.ts";

// How long a sync may hold its list before another may start: longer than
// any sync takes, so only a sync that never finished is overtaken.
const SYNC_HOLD: ReturnType<typeof sql> = sql`interval '5 minutes'`;
const LINE_BREAKS = /\s+/gu;
// The list's name when its collection's name makes no list name.
const FALLBACK_NAME = "Zotero Collection";
const LIST_NAME_MAX = 80;

// One reference of a Zotero Collection list, as its pages show it.
interface ZoteroReference {
  readonly id: ZoteroReferenceId;
  readonly entry: WorksCitedEntry;
  // The item's page on zotero.org, if Zotero gave one.
  readonly href: string | undefined;
  // The checkmark as the last sync read it; undefined before a sync read
  // the checkmark tag.
  readonly checked: boolean | undefined;
  // The checkmark the next sync sends, if any.
  readonly pending: boolean | undefined;
}

// A Zotero Collection list, as everyone in its quest sees it.
interface ZoteroList {
  readonly list: List;
  readonly collectionName: string;
  // The checkmark tag, if the list is checkable.
  readonly checkmarkTag: string | undefined;
  // Whether its references show checkmarks that may be changed: the list
  // is checkable, a sync read its tag, and its collection is available.
  readonly markable: boolean;
  // Whether checkmarks show at all: as markable, but also while the
  // collection is unavailable.
  readonly checkmarksShown: boolean;
  // The end of the last successful sync.
  readonly syncedAt: Date;
  readonly unavailable: Unavailable | undefined;
  readonly lastSync: SyncResult;
  readonly references: readonly ZoteroReference[];
  // How many references have a pending checkmark change.
  readonly pending: number;
}

// An item of the collection as a sync leaves it, in Works Cited order.
interface SyncedReference {
  readonly key: string;
  readonly entry: WorksCitedEntry;
  readonly href: string | undefined;
  readonly tags: readonly string[];
}

// What a sync starts from: the list's collection and checkmark tag, and
// each reference's pending change and mark count when it began.
interface SyncStart {
  readonly questId: QuestId;
  readonly listId: ListId;
  readonly zoteroUserId: string;
  readonly collectionKey: string;
  readonly checkmarkTag: string | undefined;
  readonly references: readonly {
    readonly id: string;
    readonly itemKey: string;
    readonly entry: WorksCitedEntry;
    readonly pending: boolean | undefined;
    readonly markRevision: number;
  }[];
}

// How the Zotero half of a sync went. confirmed holds each item whose
// checkmark Zotero now has as pending asked, and skipped each item whose
// pending change was dropped because the item left the collection.
type SyncEnd =
  | {
      readonly kind: "synced";
      readonly collectionName: string;
      readonly items: readonly SyncedReference[];
      readonly confirmed: ReadonlyMap<string, boolean>;
      readonly skipped: ReadonlySet<string>;
    }
  | {
      readonly kind: "failed";
      readonly problem: SyncProblem;
      readonly confirmed: ReadonlyMap<string, boolean>;
      readonly skipped: ReadonlySet<string>;
    };

type ReferenceRow = typeof zoteroReferences.$inferSelect;

function listNameOf(collectionName: string): string {
  const name = collectionName
    .replace(LINE_BREAKS, " ")
    .trim()
    .slice(0, LIST_NAME_MAX)
    .trim();
  return LIST_WORD.safeParse(name).data ?? FALLBACK_NAME;
}

function orUndefined<T>(value: T | null): T | undefined {
  if (value === null) {
    return undefined;
  }
  return value;
}

function toReference(row: ReferenceRow): ZoteroReference {
  return {
    id: ZOTERO_REFERENCE_ID.parse(row.id),
    entry: WORKS_CITED_ENTRY.parse(row.entry),
    href: orUndefined(row.href),
    checked: orUndefined(row.checked),
    pending: orUndefined(row.pending),
  };
}

function nowResult(): string {
  return new Date().toISOString();
}

async function readOne(
  db: Database | Transaction,
  user: UserId,
  questId: QuestId,
  listId: ListId,
): Promise<ZoteroList | undefined> {
  const [row] = await db
    .select({ list: lists, zotero: zoteroLists })
    .from(zoteroLists)
    .innerJoin(lists, eq(lists.id, zoteroLists.listId))
    .where(
      and(
        eq(zoteroLists.listId, listId),
        eq(zoteroLists.questId, questId),
        zoteroListOpenTo(user),
        listOpenTo(user),
      ),
    );
  if (row === undefined) {
    return undefined;
  }
  const rows = await db
    .select()
    .from(zoteroReferences)
    .where(
      and(eq(zoteroReferences.listId, listId), zoteroReferenceOpenTo(user)),
    )
    .orderBy(zoteroReferences.position, zoteroReferences.id);
  const references = rows.map(toReference);
  const { zotero } = row;
  const checkmarkTag = orUndefined(zotero.checkmarkTag);
  const checkmarksShown =
    checkmarkTag !== undefined && zotero.tagRead === checkmarkTag;
  const unavailable = UNAVAILABLE.safeParse(zotero.unavailable).data;
  return {
    list: {
      id: LIST_ID.parse(row.list.id),
      name: row.list.name,
      type: "zotero-collection",
      position: row.list.position,
      version: row.list.version,
    },
    collectionName: zotero.collectionName,
    checkmarkTag,
    checkmarksShown,
    markable: checkmarksShown && unavailable === undefined,
    syncedAt: zotero.syncedAt,
    unavailable,
    lastSync: SYNC_RESULT.parse(zotero.lastSync),
    references,
    pending: references.filter(({ pending }) => pending !== undefined).length,
  };
}

// The quest's Zotero Collection list, as user sees it, or undefined when it
// isn't one or isn't open to them.
function readZoteroList(
  user: UserId,
  questId: QuestId,
  listId: ListId,
): Promise<ZoteroList | undefined> {
  return withAppErrors("readZoteroList", () =>
    readOne(getDb(), user, questId, listId),
  );
}

// Each of the quest's lists that is a Zotero Collection list, as user sees
// it.
function readZoteroLists(
  user: UserId,
  questId: QuestId,
  listIds: readonly ListId[],
): Promise<ZoteroList[]> {
  return withAppErrors("readZoteroLists", async () => {
    const found = await Promise.all(
      listIds.map((listId) => readOne(getDb(), user, questId, listId)),
    );
    return found.flatMap((list) => list ?? []);
  });
}

function referenceValues(
  {
    questId,
    listId,
    tag,
  }: {
    readonly questId: QuestId;
    readonly listId: ListId;
    readonly tag: string | undefined;
  },
  items: readonly SyncedReference[],
): (typeof zoteroReferences.$inferInsert)[] {
  return items.map((item, position) => {
    let checked: boolean | null = null;
    if (tag !== undefined) {
      checked = item.tags.includes(tag);
    }
    return {
      questId,
      listId,
      itemKey: item.key,
      position,
      entry: item.entry,
      searchText: plainText(item.entry),
      href: item.href ?? null,
      checked,
    };
  });
}

// Adds a Zotero Collection list at the end of the owner's quest, holding
// the items in their order, as one successful import. Undefined when the
// quest isn't the owner's.
function insertZoteroList(
  owner: UserId,
  questId: QuestId,
  source: {
    readonly zoteroUserId: string;
    readonly collectionKey: string;
    readonly collectionName: string;
    readonly checkmarkTag: string | undefined;
  },
  items: readonly SyncedReference[],
): Promise<ListId | undefined> {
  return withAppErrors("insertZoteroList", () =>
    inTransaction(async (tx) => {
      const [quest] = await tx
        .select({ id: quests.id })
        .from(quests)
        .where(and(eq(quests.id, questId), questOwnedBy(owner)))
        .for("update");
      if (quest === undefined) {
        return;
      }
      const [last] = await tx
        .select({ position: lists.position })
        .from(lists)
        .where(and(eq(lists.questId, questId), listOwnedBy(owner)))
        .orderBy(desc(lists.position))
        .limit(1);
      const [added] = await tx
        .insert(lists)
        .values({
          questId,
          name: listNameOf(source.collectionName),
          type: "zotero-collection",
          position: (last?.position ?? -1) + 1,
        })
        .returning({ id: lists.id });
      if (added === undefined) {
        throw new Error("Inserting a list returned no list");
      }
      const listId = LIST_ID.parse(added.id);
      const result: SyncResult = {
        kind: "synced",
        at: nowResult(),
        sent: 0,
        skipped: [],
        waiting: 0,
      };
      await tx.insert(zoteroLists).values({
        listId,
        questId,
        zoteroUserId: source.zoteroUserId,
        collectionKey: source.collectionKey,
        collectionName: source.collectionName,
        checkmarkTag: source.checkmarkTag ?? null,
        tagRead: source.checkmarkTag ?? null,
        lastSync: result,
      });
      const values = referenceValues(
        { questId, listId, tag: source.checkmarkTag },
        items,
      );
      if (values.length > 0) {
        await tx.insert(zoteroReferences).values(values);
      }
      return listId;
    }),
  );
}

// Sets user's checkmark on the reference as the list's pending change: the
// latest mark wins, and a mark back to the synced checkmark leaves nothing
// pending. "closed" when the list takes no marks now.
function markZoteroReference(
  user: UserId,
  {
    questId,
    listId,
    referenceId,
  }: {
    readonly questId: QuestId;
    readonly listId: ListId;
    readonly referenceId: ZoteroReferenceId;
  },
  checked: boolean,
): Promise<"saved" | "missing" | "closed"> {
  return withAppErrors("markZoteroReference", () =>
    inTransaction(async (tx) => {
      const [row] = await tx
        .select({ reference: zoteroReferences, zotero: zoteroLists })
        .from(zoteroReferences)
        .innerJoin(zoteroLists, eq(zoteroLists.listId, zoteroReferences.listId))
        .where(
          and(
            eq(zoteroReferences.id, referenceId),
            eq(zoteroReferences.listId, listId),
            eq(zoteroReferences.questId, questId),
            zoteroReferenceOpenTo(user),
            zoteroListOpenTo(user),
          ),
        )
        .for("update", { of: zoteroReferences });
      if (row === undefined) {
        return "missing";
      }
      const { reference, zotero } = row;
      if (
        zotero.checkmarkTag === null ||
        zotero.tagRead !== zotero.checkmarkTag ||
        zotero.unavailable !== null ||
        reference.checked === null
      ) {
        return "closed";
      }
      let pending: boolean | null = checked;
      if (checked === reference.checked) {
        pending = null;
      }
      await tx
        .update(zoteroReferences)
        .set({
          pending,
          markRevision: sql`${zoteroReferences.markRevision} + 1`,
        })
        .where(
          and(
            eq(zoteroReferences.id, reference.id),
            zoteroReferenceOpenTo(user),
          ),
        );
      return "saved";
    }),
  );
}

async function lockOwned(
  tx: Transaction,
  owner: UserId,
  questId: QuestId,
  listId: ListId,
): Promise<typeof zoteroLists.$inferSelect | undefined> {
  const [row] = await tx
    .select()
    .from(zoteroLists)
    .where(
      and(
        eq(zoteroLists.listId, listId),
        eq(zoteroLists.questId, questId),
        zoteroListOwnedBy(owner),
      ),
    )
    .for("update");
  return row;
}

// Drops every pending checkmark change in the owner's list. False when the
// list isn't the owner's.
function discardZoteroChanges(
  owner: UserId,
  questId: QuestId,
  listId: ListId,
): Promise<boolean> {
  return withAppErrors("discardZoteroChanges", () =>
    inTransaction(async (tx) => {
      if ((await lockOwned(tx, owner, questId, listId)) === undefined) {
        return false;
      }
      await tx
        .update(zoteroReferences)
        .set({
          pending: null,
          markRevision: sql`${zoteroReferences.markRevision} + 1`,
        })
        .where(
          and(
            eq(zoteroReferences.listId, listId),
            isNotNull(zoteroReferences.pending),
            zoteroReferenceOwnedBy(owner),
          ),
        );
      return true;
    }),
  );
}

// Saves the owner's list name and checkmark tag (undefined when it isn't
// checkable). A name other than the collection's stops the list following
// the collection's renames. Changing the tag leaves Zotero as it is and
// waits for a sync to read the new tag. "pending" when the tag would
// change while checkmark changes wait; "needs-write" when the list would
// become checkable on a connection that can't change the library.
function saveZoteroListSettings(
  owner: UserId,
  { questId, listId }: { readonly questId: QuestId; readonly listId: ListId },
  settings: {
    readonly name: string;
    readonly checkmarkTag: string | undefined;
  },
): Promise<"saved" | "missing" | "pending" | "needs-write"> {
  return withAppErrors("saveZoteroListSettings", () =>
    inTransaction(async (tx) => {
      const zotero = await lockOwned(tx, owner, questId, listId);
      if (zotero === undefined) {
        return "missing";
      }
      const checkmarkTag = settings.checkmarkTag ?? null;
      if (checkmarkTag !== zotero.checkmarkTag) {
        const [waiting] = await tx
          .select({ id: zoteroReferences.id })
          .from(zoteroReferences)
          .where(
            and(
              eq(zoteroReferences.listId, listId),
              isNotNull(zoteroReferences.pending),
              zoteroReferenceOwnedBy(owner),
            ),
          )
          .limit(1);
        if (waiting !== undefined) {
          return "pending";
        }
      }
      if (checkmarkTag !== null && zotero.checkmarkTag === null) {
        const [connection] = await tx
          .select({ writeAccess: zoteroConnections.writeAccess })
          .from(zoteroConnections)
          .where(zoteroConnectionOwnedBy(owner));
        if (connection?.writeAccess !== true) {
          return "needs-write";
        }
      }
      await tx
        .update(zoteroLists)
        .set({
          checkmarkTag,
          customName: settings.name !== listNameOf(zotero.collectionName),
        })
        .where(and(eq(zoteroLists.listId, listId), zoteroListOwnedBy(owner)));
      await tx
        .update(lists)
        .set({ name: settings.name })
        .where(and(eq(lists.id, listId), listOwnedBy(owner)));
      return "saved";
    }),
  );
}

// Removes the owner's Zotero Collection list with its references and
// pending changes, leaving Zotero as it is. False when there was none.
function removeZoteroList(
  owner: UserId,
  questId: QuestId,
  listId: ListId,
): Promise<boolean> {
  return withAppErrors("removeZoteroList", async () => {
    const removed = await getDb()
      .delete(lists)
      .where(
        and(
          eq(lists.id, listId),
          eq(lists.questId, questId),
          eq(lists.type, "zotero-collection"),
          listOwnedBy(owner),
        ),
      )
      .returning({ id: lists.id });
    return removed.length > 0;
  });
}

// Holds the owner's list for a sync and answers what the sync starts from;
// "already-syncing" while another sync holds it.
function beginZoteroSync(
  owner: UserId,
  questId: QuestId,
  listId: ListId,
): Promise<SyncStart | "missing" | "already-syncing"> {
  return withAppErrors("beginZoteroSync", () =>
    inTransaction(async (tx) => {
      const zotero = await lockOwned(tx, owner, questId, listId);
      if (zotero === undefined) {
        return "missing";
      }
      const [held] = await tx
        .update(zoteroLists)
        .set({ syncStartedAt: sql`now()` })
        .where(
          and(
            eq(zoteroLists.listId, listId),
            zoteroListOwnedBy(owner),
            sql`(${zoteroLists.syncStartedAt} is null or ${zoteroLists.syncStartedAt} < now() - ${SYNC_HOLD})`,
          ),
        )
        .returning({ listId: zoteroLists.listId });
      if (held === undefined) {
        return "already-syncing";
      }
      const rows = await tx
        .select()
        .from(zoteroReferences)
        .where(
          and(
            eq(zoteroReferences.listId, listId),
            zoteroReferenceOwnedBy(owner),
          ),
        );
      return {
        questId,
        listId,
        zoteroUserId: zotero.zoteroUserId,
        collectionKey: zotero.collectionKey,
        checkmarkTag: orUndefined(zotero.checkmarkTag),
        references: rows.map((row) => ({
          id: row.id,
          itemKey: row.itemKey,
          entry: WORKS_CITED_ENTRY.parse(row.entry),
          pending: orUndefined(row.pending),
          markRevision: row.markRevision,
        })),
      };
    }),
  );
}

// The pending change a reference keeps once a sync left its checkmark as
// checked: none if no one marked it while the sync ran or the mark agrees,
// else the mark made meanwhile. A mark back to the checkmark from before
// the sync left nothing pending then, but still asks for that checkmark.
function pendingAfter(
  row: ReferenceRow,
  started: SyncStart["references"][number] | undefined,
  checked: boolean | null,
): boolean | null {
  if (started !== undefined && row.markRevision === started.markRevision) {
    return null;
  }
  const marked = row.pending ?? row.checked;
  if (marked === checked) {
    return null;
  }
  return marked;
}

async function applySynced(
  tx: Transaction,
  owner: UserId,
  start: SyncStart,
  end: Extract<SyncEnd, { kind: "synced" }>,
): Promise<void> {
  const { questId, listId } = start;
  const keys = end.items.map(({ key }) => key);
  const removed = and(
    eq(zoteroReferences.listId, listId),
    zoteroReferenceOwnedBy(owner),
  );
  if (keys.length === 0) {
    await tx.delete(zoteroReferences).where(removed);
  } else {
    await tx
      .delete(zoteroReferences)
      .where(and(removed, notInArray(zoteroReferences.itemKey, keys)));
  }
  const current = await tx
    .select()
    .from(zoteroReferences)
    .where(
      and(eq(zoteroReferences.listId, listId), zoteroReferenceOwnedBy(owner)),
    );
  const byKey = new Map(current.map((row) => [row.itemKey, row]));
  const started = new Map(
    start.references.map((reference) => [reference.id, reference]),
  );
  const values = referenceValues(
    { questId, listId, tag: start.checkmarkTag },
    end.items,
  );
  const rows = values.map((value) => {
    const row = byKey.get(value.itemKey);
    let pending: boolean | null = null;
    if (row !== undefined) {
      pending = pendingAfter(row, started.get(row.id), value.checked ?? null);
    }
    return { ...value, pending };
  });
  const waiting = rows.filter(({ pending }) => pending !== null).length;
  if (rows.length > 0) {
    await tx
      .insert(zoteroReferences)
      .values(rows)
      .onConflictDoUpdate({
        target: [zoteroReferences.listId, zoteroReferences.itemKey],
        set: {
          position: sql`excluded.position`,
          entry: sql`excluded.entry`,
          searchText: sql`excluded.search_text`,
          href: sql`excluded.href`,
          checked: sql`excluded.checked`,
          pending: sql`excluded.pending`,
        },
      });
  }
  const result: SyncResult = {
    kind: "synced",
    at: nowResult(),
    sent: end.confirmed.size,
    skipped: skippedEntries(start, end.skipped),
    waiting,
  };
  const [zotero] = await tx
    .update(zoteroLists)
    .set({
      collectionName: end.collectionName,
      tagRead: start.checkmarkTag ?? null,
      syncedAt: sql`now()`,
      syncStartedAt: null,
      unavailable: null,
      lastSync: result,
    })
    .where(and(eq(zoteroLists.listId, listId), zoteroListOwnedBy(owner)))
    .returning({ customName: zoteroLists.customName });
  if (zotero?.customName === false) {
    await tx
      .update(lists)
      .set({ name: listNameOf(end.collectionName) })
      .where(and(eq(lists.id, listId), listOwnedBy(owner)));
  }
}

function skippedEntries(
  start: SyncStart,
  skipped: ReadonlySet<string>,
): { key: string; text: string }[] {
  return start.references
    .filter(({ itemKey }) => skipped.has(itemKey))
    .map(({ itemKey, entry }) => ({ key: itemKey, text: plainText(entry) }));
}

async function applyFailed(
  tx: Transaction,
  owner: UserId,
  start: SyncStart,
  end: Extract<SyncEnd, { kind: "failed" }>,
): Promise<void> {
  const { listId } = start;
  const rows = await tx
    .select()
    .from(zoteroReferences)
    .where(
      and(eq(zoteroReferences.listId, listId), zoteroReferenceOwnedBy(owner)),
    )
    .for("update");
  const started = new Map(
    start.references.map((reference) => [reference.id, reference]),
  );
  const updated = rows.map((row) => {
    const confirmed = end.confirmed.get(row.itemKey);
    const unmarked = row.markRevision === started.get(row.id)?.markRevision;
    if (confirmed !== undefined) {
      return {
        row,
        checked: confirmed,
        pending: pendingAfter(row, started.get(row.id), confirmed),
      };
    }
    if (end.skipped.has(row.itemKey) && unmarked) {
      return { row, checked: row.checked, pending: null };
    }
    return { row, checked: row.checked, pending: row.pending };
  });
  const waiting = updated.filter(({ pending }) => pending !== null).length;
  await Promise.all(
    updated
      .filter(
        ({ row, checked, pending }) =>
          checked !== row.checked || pending !== row.pending,
      )
      .map(({ row, checked, pending }) =>
        tx
          .update(zoteroReferences)
          .set({ checked, pending })
          .where(
            and(eq(zoteroReferences.id, row.id), zoteroReferenceOwnedBy(owner)),
          ),
      ),
  );
  const result: SyncResult = {
    kind: "failed",
    at: nowResult(),
    problem: end.problem,
    sent: end.confirmed.size,
    skipped: skippedEntries(start, end.skipped),
    waiting,
  };
  const unavailable = UNAVAILABLE.safeParse(end.problem).data;
  const change: Partial<typeof zoteroLists.$inferInsert> = {
    syncStartedAt: null,
    lastSync: result,
  };
  if (unavailable !== undefined) {
    change.unavailable = unavailable;
  }
  await tx
    .update(zoteroLists)
    .set(change)
    .where(and(eq(zoteroLists.listId, listId), zoteroListOwnedBy(owner)));
}

// Saves what the sync found and did, and lets the list go for the next
// sync. A successful sync replaces the references with the items, in their
// order, and keeps only pending changes marked while it ran that differ
// from the new checkmarks. A failed one keeps the references, records the
// changes Zotero confirmed, and leaves the rest pending.
function finishZoteroSync(
  owner: UserId,
  start: SyncStart,
  end: SyncEnd,
): Promise<void> {
  return withAppErrors("finishZoteroSync", () =>
    inTransaction(async (tx) => {
      if (end.kind === "synced") {
        await applySynced(tx, owner, start, end);
      } else {
        await applyFailed(tx, owner, start, end);
      }
    }),
  );
}

export type {
  SyncEnd,
  SyncedReference,
  SyncStart,
  ZoteroList,
  ZoteroReference,
};
export {
  beginZoteroSync,
  discardZoteroChanges,
  finishZoteroSync,
  insertZoteroList,
  markZoteroReference,
  readZoteroList,
  readZoteroLists,
  removeZoteroList,
  saveZoteroListSettings,
};
