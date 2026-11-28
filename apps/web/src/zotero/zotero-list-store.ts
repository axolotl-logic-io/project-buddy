// Zotero Collection lists in Postgres: each list's collection, settings and
// sync result, and the references it imported with their checkmarks and
// notes. Everyone a quest is open to may read its Zotero Collection lists,
// mark their references and write notes on them; the rest is its owner's (src/accounts/owner-scope.ts).
// The sync (src/zotero/zotero-sync.ts) talks to Zotero between
// beginZoteroSync and finishZoteroSync, outside any transaction.
import {
  and,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  max,
  notInArray,
  sql,
} from "drizzle-orm";
import {
  listOpenTo,
  listOwnedBy,
  questOwnedBy,
  zoteroConnectionOwnedBy,
  zoteroListOpenTo,
  zoteroListOwnedBy,
  zoteroNoteOpenTo,
  zoteroNoteOwnedBy,
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
import { users } from "@/db/tables/users.ts";
import {
  zoteroConnections,
  zoteroLists,
  zoteroNotes,
  zoteroReferences,
} from "@/db/tables/zotero.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import type { QuestId, UserId } from "@/ids.ts";
import { LIST_ID, LIST_WORD, type ListId } from "@/lists/list.ts";
import type { List } from "@/lists/list-store.ts";
import { NOTE_MAX, noteFromHtml, tidyNote } from "./note-text.ts";
import { plainText } from "./works-cited.ts";
import {
  SYNC_RESULT,
  type SyncProblem,
  type SyncResult,
  UNAVAILABLE,
  type Unavailable,
  WORKS_CITED_ENTRY,
  type WorksCitedEntry,
  ZOTERO_NOTE_ID,
  ZOTERO_REFERENCE_ID,
  type ZoteroNoteId,
  type ZoteroReferenceId,
} from "./zotero.ts";
import type { ZoteroNote } from "./zotero-api.ts";

// How long a sync may hold its list before another may start: longer than
// any sync takes, so only a sync that never finished is overtaken.
const SYNC_HOLD: ReturnType<typeof sql> = sql`interval '5 minutes'`;
const LINE_BREAKS = /\s+/gu;
// The list's name when its collection's name makes no list name.
const FALLBACK_NAME = "Zotero Collection";
const LIST_NAME_MAX = 80;

// A note on a reference, as the list's page shows it.
interface ZoteroReferenceNote {
  readonly id: ZoteroNoteId;
  // The note's text: what waits for the next sync, else what Zotero had.
  readonly text: string;
  // Whether the text waits for the next sync.
  readonly waiting: boolean;
  // Whether it may be edited here: a note with formatting is edited in
  // Zotero.
  readonly editable: boolean;
  // Who wrote it: the person who last wrote it here, else the quest's
  // owner, whose library it is in. Undefined when they have no name.
  readonly author: string | undefined;
}

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
  // Its notes, oldest first.
  readonly notes: readonly ZoteroReferenceNote[];
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
  // How many checkmark changes and notes wait for the next sync.
  readonly pending: number;
}

// An item of the collection as a sync leaves it, in Works Cited order.
interface SyncedReference {
  readonly key: string;
  readonly entry: WorksCitedEntry;
  readonly href: string | undefined;
  readonly tags: readonly string[];
}

// A note as a sync starts from it: its Zotero note, if a sync added it, the
// text that waits, and its edit count when the sync began.
interface StartNote {
  readonly id: string;
  readonly itemKey: string;
  readonly noteKey: string | undefined;
  readonly version: number | undefined;
  readonly pending: string | undefined;
  readonly revision: number;
}

// A note the sync added to Zotero or changed there, by its row's id.
interface SentNote {
  readonly noteKey: string;
  readonly version: number;
  readonly text: string;
}

// What a sync starts from: the list's collection and checkmark tag, each
// reference's pending change and mark count, and each note, when it
// began.
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
  readonly notes: readonly StartNote[];
}

// What a sync sent, whether it went on to succeed or not. confirmed holds
// each item whose checkmark Zotero now has as pending asked, and skipped
// each item whose pending changes were dropped because the item left the
// collection. notesSent holds each note Zotero now has as it waited, by its
// row's id.
interface SyncSent {
  readonly confirmed: ReadonlyMap<string, boolean>;
  readonly skipped: ReadonlySet<string>;
  readonly notesSent: ReadonlyMap<string, SentNote>;
}

// How the Zotero half of a sync went. A successful sync read the items and,
// unless Zotero didn't let it, their notes.
type SyncEnd =
  | (SyncSent & {
      readonly kind: "synced";
      readonly collectionName: string;
      readonly items: readonly SyncedReference[];
      readonly notes: readonly ZoteroNote[] | undefined;
    })
  | (SyncSent & {
      readonly kind: "failed";
      readonly problem: SyncProblem;
    });

type ReferenceRow = typeof zoteroReferences.$inferSelect;
type NoteRow = typeof zoteroNotes.$inferSelect;

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

function toReference(
  row: ReferenceRow,
  notes: readonly ZoteroReferenceNote[],
): ZoteroReference {
  return {
    id: ZOTERO_REFERENCE_ID.parse(row.id),
    entry: WORKS_CITED_ENTRY.parse(row.entry),
    href: orUndefined(row.href),
    checked: orUndefined(row.checked),
    pending: orUndefined(row.pending),
    notes,
  };
}

// The list's notes as user sees them, by their item's key.
async function readNotes(
  db: Database | Transaction,
  user: UserId,
  questId: QuestId,
  listId: ListId,
): Promise<Map<string, ZoteroReferenceNote[]>> {
  const [owner] = await db
    .select({ name: users.name })
    .from(quests)
    .innerJoin(users, eq(users.id, quests.userId))
    .where(eq(quests.id, questId));
  const rows = await db
    .select({ note: zoteroNotes, author: users.name })
    .from(zoteroNotes)
    .leftJoin(users, eq(users.id, zoteroNotes.writtenBy))
    .where(and(eq(zoteroNotes.listId, listId), zoteroNoteOpenTo(user)))
    .orderBy(zoteroNotes.position, zoteroNotes.id);
  const byItem = new Map<string, ZoteroReferenceNote[]>();
  for (const { note, author } of rows) {
    let by = owner?.name ?? undefined;
    if (note.writtenBy !== null) {
      by = author ?? undefined;
    }
    byItem.set(note.itemKey, [
      ...(byItem.get(note.itemKey) ?? []),
      {
        id: ZOTERO_NOTE_ID.parse(note.id),
        text: note.pending ?? note.text,
        waiting: note.pending !== null,
        editable: note.plain,
        author: by,
      },
    ]);
  }
  return byItem;
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
  const notes = await readNotes(db, user, questId, listId);
  const references = rows.map((reference) =>
    toReference(reference, notes.get(reference.itemKey) ?? []),
  );
  const waitingNotes = [...notes.values()]
    .flat()
    .filter(({ waiting }) => waiting).length;
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
    pending:
      references.filter(({ pending }) => pending !== undefined).length +
      waitingNotes,
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

// The rows for the notes Zotero has on the list's items, oldest first
// within each item; none for a note on an item not in the list.
function noteValues(
  { questId, listId }: { readonly questId: QuestId; readonly listId: ListId },
  items: readonly SyncedReference[],
  notes: readonly ZoteroNote[],
): (typeof zoteroNotes.$inferInsert)[] {
  const keys = new Set(items.map(({ key }) => key));
  const counts = new Map<string, number>();
  return notes.flatMap((note) => {
    if (!keys.has(note.parentItem)) {
      return [];
    }
    const position = counts.get(note.parentItem) ?? 0;
    counts.set(note.parentItem, position + 1);
    const { text, plain } = noteFromHtml(note.html);
    return [
      {
        questId,
        listId,
        itemKey: note.parentItem,
        noteKey: note.key,
        version: note.version,
        position,
        text,
        plain,
      },
    ];
  });
}

// Adds a Zotero Collection list at the end of the owner's quest, holding
// the items in their order with their notes, as one successful import.
// Undefined when the quest isn't the owner's.
function insertZoteroList(
  owner: UserId,
  questId: QuestId,
  source: {
    readonly zoteroUserId: string;
    readonly collectionKey: string;
    readonly collectionName: string;
    readonly checkmarkTag: string | undefined;
  },
  {
    items,
    notes,
  }: {
    readonly items: readonly SyncedReference[];
    readonly notes: readonly ZoteroNote[];
  },
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
        notesSent: 0,
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
      const noteRows = noteValues({ questId, listId }, items, notes);
      if (noteRows.length > 0) {
        await tx.insert(zoteroNotes).values(noteRows);
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

// Saves user's text as a note on the reference, waiting for the owner's
// next sync: a new note, or the note given. A note back to the text Zotero
// has leaves nothing waiting. "closed" when the list's collection can't be
// reached; "formatted" when the note has formatting, to edit in Zotero.
function saveZoteroNote(
  user: UserId,
  {
    questId,
    listId,
    referenceId,
    noteId,
  }: {
    readonly questId: QuestId;
    readonly listId: ListId;
    readonly referenceId: ZoteroReferenceId;
    readonly noteId: ZoteroNoteId | undefined;
  },
  draft: string,
): Promise<"saved" | "missing" | "closed" | "formatted"> {
  const text = tidyNote(draft);
  if (text === "" || text.length > NOTE_MAX) {
    // The action checks the length first; this guards other callers.
    throw new RangeError(`A note holds 1 to ${NOTE_MAX} characters`);
  }
  return withAppErrors("saveZoteroNote", () =>
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
      if (row.zotero.unavailable !== null) {
        return "closed";
      }
      const { itemKey } = row.reference;
      if (noteId === undefined) {
        const [last] = await tx
          .select({ position: max(zoteroNotes.position) })
          .from(zoteroNotes)
          .where(
            and(
              eq(zoteroNotes.listId, listId),
              eq(zoteroNotes.itemKey, itemKey),
              zoteroNoteOpenTo(user),
            ),
          );
        await tx.insert(zoteroNotes).values({
          questId,
          listId,
          itemKey,
          position: (last?.position ?? -1) + 1,
          text: "",
          plain: true,
          pending: text,
          revision: 1,
          writtenBy: user,
        });
        return "saved";
      }
      const [note] = await tx
        .select()
        .from(zoteroNotes)
        .where(
          and(
            eq(zoteroNotes.id, noteId),
            eq(zoteroNotes.listId, listId),
            eq(zoteroNotes.itemKey, itemKey),
            zoteroNoteOpenTo(user),
          ),
        )
        .for("update");
      if (note === undefined) {
        return "missing";
      }
      if (!note.plain) {
        return "formatted";
      }
      let pending: string | null = text;
      if (note.noteKey !== null && text === note.text) {
        pending = null;
      }
      await tx
        .update(zoteroNotes)
        .set({
          pending,
          revision: sql`${zoteroNotes.revision} + 1`,
          writtenBy: user,
        })
        .where(and(eq(zoteroNotes.id, note.id), zoteroNoteOpenTo(user)));
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

// Drops every pending checkmark change and waiting note in the owner's
// list: a note no sync added yet goes. False when the list isn't the
// owner's.
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
      await tx
        .delete(zoteroNotes)
        .where(
          and(
            eq(zoteroNotes.listId, listId),
            isNull(zoteroNotes.noteKey),
            zoteroNoteOwnedBy(owner),
          ),
        );
      await tx
        .update(zoteroNotes)
        .set({
          pending: null,
          revision: sql`${zoteroNotes.revision} + 1`,
        })
        .where(
          and(
            eq(zoteroNotes.listId, listId),
            isNotNull(zoteroNotes.pending),
            zoteroNoteOwnedBy(owner),
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
      const notes = await tx
        .select()
        .from(zoteroNotes)
        .where(and(eq(zoteroNotes.listId, listId), zoteroNoteOwnedBy(owner)));
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
        notes: notes.map((note) => ({
          id: note.id,
          itemKey: note.itemKey,
          noteKey: orUndefined(note.noteKey),
          version: orUndefined(note.version),
          pending: orUndefined(note.pending),
          revision: note.revision,
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

// The text a note keeps waiting once a sync is done with it: none if the
// sync sent it or dropped it and no one edited it meanwhile, or if the
// edit made meanwhile is the text the note now has in Zotero; else that
// edit.
function notePendingAfter(
  row: NoteRow,
  started: StartNote | undefined,
  done: boolean,
  now: { readonly keyed: boolean; readonly text: string },
): string | null {
  if (row.pending === null) {
    return null;
  }
  if (done && started !== undefined && row.revision === started.revision) {
    return null;
  }
  if (now.keyed && row.pending === now.text) {
    return null;
  }
  return row.pending;
}

async function lockNotes(
  tx: Transaction,
  owner: UserId,
  listId: ListId,
): Promise<NoteRow[]> {
  return await tx
    .select()
    .from(zoteroNotes)
    .where(and(eq(zoteroNotes.listId, listId), zoteroNoteOwnedBy(owner)))
    .for("update");
}

function setNote(
  tx: Transaction,
  owner: UserId,
  id: string,
  change: Partial<typeof zoteroNotes.$inferInsert>,
): Promise<unknown> {
  return tx
    .update(zoteroNotes)
    .set(change)
    .where(and(eq(zoteroNotes.id, id), zoteroNoteOwnedBy(owner)));
}

function dropNotes(
  tx: Transaction,
  owner: UserId,
  ids: readonly string[],
): Promise<unknown> {
  if (ids.length === 0) {
    return Promise.resolve();
  }
  return tx
    .delete(zoteroNotes)
    .where(and(inArray(zoteroNotes.id, ids), zoteroNoteOwnedBy(owner)));
}

// A note as Zotero has it once a sync is done: what the sync read, with
// what it sent in place of what it read, and each note it added.
interface NoteNow {
  readonly noteKey: string;
  readonly version: number;
  readonly itemKey: string;
  readonly text: string;
  readonly plain: boolean;
  // The row whose text the sync sent, if it sent one.
  readonly sentId: string | undefined;
}

function notesNow(
  start: SyncStart,
  end: Extract<SyncEnd, { kind: "synced" }>,
  read: readonly ZoteroNote[],
): NoteNow[] {
  const items = new Set(end.items.map(({ key }) => key));
  const sentByKey = new Map(
    [...end.notesSent].map(([id, sent]) => [sent.noteKey, { id, sent }]),
  );
  const startedById = new Map(start.notes.map((note) => [note.id, note]));
  const readKeys = new Set(read.map(({ key }) => key));
  const kept: NoteNow[] = read
    .filter(({ parentItem }) => items.has(parentItem))
    .map((note) => {
      const sent = sentByKey.get(note.key);
      if (sent !== undefined) {
        return {
          noteKey: note.key,
          version: sent.sent.version,
          itemKey: note.parentItem,
          text: sent.sent.text,
          plain: true,
          sentId: sent.id,
        };
      }
      const { text, plain } = noteFromHtml(note.html);
      return {
        noteKey: note.key,
        version: note.version,
        itemKey: note.parentItem,
        text,
        plain,
        sentId: undefined,
      };
    });
  const added = [...end.notesSent].flatMap(([id, sent]): NoteNow[] => {
    const itemKey = startedById.get(id)?.itemKey;
    if (readKeys.has(sent.noteKey) || itemKey === undefined) {
      return [];
    }
    return [{ ...sent, itemKey, plain: true, sentId: id }];
  });
  return [...kept, ...added];
}

// Saves the notes Zotero has once a successful sync is done, each with its
// position under its item, and drops the notes of items that left the
// list. A note gone from Zotero goes too, unless someone edited it during
// the sync: then it waits to be added again. Answers how many notes wait.
async function applySyncedNotes(
  tx: Transaction,
  owner: UserId,
  start: SyncStart,
  end: Extract<SyncEnd, { kind: "synced" }>,
): Promise<number> {
  if (end.notes === undefined) {
    return applySentNotes(tx, owner, start, end);
  }
  const { questId, listId } = start;
  const rows = await lockNotes(tx, owner, listId);
  const rowById = new Map(rows.map((row) => [row.id, row]));
  const rowByKey = new Map(rows.map((row) => [row.noteKey, row]));
  const startedById = new Map(start.notes.map((note) => [note.id, note]));
  const items = new Set(end.items.map(({ key }) => key));
  const positions = new Map<string, number>();
  const matched = new Set<string>();
  const writes: Promise<unknown>[] = [];
  const inserts: (typeof zoteroNotes.$inferInsert)[] = [];
  let waiting = 0;
  for (const note of notesNow(start, end, end.notes)) {
    const position = positions.get(note.itemKey) ?? 0;
    positions.set(note.itemKey, position + 1);
    let row = rowByKey.get(note.noteKey);
    if (note.sentId !== undefined) {
      row = rowById.get(note.sentId);
    }
    const values = {
      itemKey: note.itemKey,
      noteKey: note.noteKey,
      version: note.version,
      position,
      text: note.text,
      plain: note.plain,
    };
    if (row === undefined) {
      inserts.push({ ...values, questId, listId });
    } else {
      matched.add(row.id);
      const pending = notePendingAfter(
        row,
        startedById.get(row.id),
        note.sentId !== undefined,
        { keyed: true, text: note.text },
      );
      // An edit in Zotero is no one's here.
      const editedInZotero =
        note.sentId === undefined && pending === null && note.text !== row.text;
      let { writtenBy } = row;
      if (editedInZotero) {
        writtenBy = null;
      }
      waiting += Number(pending !== null);
      writes.push(
        setNote(tx, owner, row.id, { ...values, pending, writtenBy }),
      );
    }
  }
  // Notes Zotero no longer has: kept to add again only when someone edited
  // them during the sync or they never reached Zotero, on items still in
  // the list.
  const dropped: string[] = [];
  for (const row of rows.filter(({ id }) => !matched.has(id))) {
    const started = startedById.get(row.id);
    const editedSince =
      row.pending !== null && row.revision !== started?.revision;
    const kept =
      items.has(row.itemKey) && (row.noteKey === null || editedSince);
    if (!kept) {
      dropped.push(row.id);
    } else if (row.noteKey !== null) {
      writes.push(
        setNote(tx, owner, row.id, { noteKey: null, version: null, text: "" }),
      );
    }
    waiting += Number(kept && row.pending !== null);
  }
  await Promise.all(writes);
  await dropNotes(tx, owner, dropped);
  if (inserts.length > 0) {
    await tx.insert(zoteroNotes).values(inserts);
  }
  return waiting;
}

// Saves the notes the sync sent when it couldn't read what Zotero has, and
// drops the waiting text of notes on items that left the collection.
// Answers how many notes wait.
async function applySentNotes(
  tx: Transaction,
  owner: UserId,
  start: SyncStart,
  end: SyncSent,
): Promise<number> {
  const rows = await lockNotes(tx, owner, start.listId);
  const startedById = new Map(start.notes.map((note) => [note.id, note]));
  const writes: Promise<unknown>[] = [];
  const dropped: string[] = [];
  let waiting = 0;
  for (const row of rows) {
    const started = startedById.get(row.id);
    const sent = end.notesSent.get(row.id);
    const unedited = row.revision === started?.revision;
    const skipped = end.skipped.has(row.itemKey) && unedited;
    if (sent !== undefined) {
      const pending = notePendingAfter(row, started, true, {
        keyed: true,
        text: sent.text,
      });
      waiting += Number(pending !== null);
      writes.push(
        setNote(tx, owner, row.id, {
          noteKey: sent.noteKey,
          version: sent.version,
          text: sent.text,
          plain: true,
          pending,
        }),
      );
    } else if (skipped && row.noteKey === null) {
      dropped.push(row.id);
    } else if (skipped) {
      writes.push(setNote(tx, owner, row.id, { pending: null }));
    } else {
      waiting += Number(row.pending !== null);
    }
  }
  await Promise.all(writes);
  await dropNotes(tx, owner, dropped);
  return waiting;
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
  const notesWaiting = await applySyncedNotes(tx, owner, start, end);
  const waiting =
    rows.filter(({ pending }) => pending !== null).length + notesWaiting;
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
    notesSent: end.notesSent.size,
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
  const notesWaiting = await applySentNotes(tx, owner, start, end);
  const waiting =
    updated.filter(({ pending }) => pending !== null).length + notesWaiting;
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
    notesSent: end.notesSent.size,
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
  SentNote,
  StartNote,
  SyncEnd,
  SyncedReference,
  SyncSent,
  SyncStart,
  ZoteroList,
  ZoteroReference,
  ZoteroReferenceNote,
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
  saveZoteroNote,
};
