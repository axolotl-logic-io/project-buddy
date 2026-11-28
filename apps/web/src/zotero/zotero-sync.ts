// Importing a Zotero collection as a list, and syncing the list with it.
// A sync holds the list in the database, talks to Zotero outside any
// transaction, then saves what it found and did
// (src/zotero/zotero-list-store.ts). It sends each pending checkmark change
// as a change to the item's tags, keeping its other tags and fields, and
// reads the item again when someone changed it in Zotero meanwhile.
import type { QuestId, UserId } from "@/ids.ts";
import type { ListId } from "@/lists/list.ts";
import { inWorksCitedOrder } from "./works-cited.ts";
import type { SyncProblem } from "./zotero.ts";
import {
  readCollectionItems,
  readCollectionName,
  readItem,
  writeTags,
  type ZoteroItem,
  type ZoteroKey,
  ZoteroProblem,
  type ZoteroTag,
} from "./zotero-api.ts";
import {
  endZoteroConnection,
  readZoteroKey,
  type ZoteroConnectionKey,
} from "./zotero-connection-store.ts";
import {
  beginZoteroSync,
  finishZoteroSync,
  insertZoteroList,
  type SyncedReference,
  type SyncStart,
} from "./zotero-list-store.ts";

// How many times a sync reads an item again and resends its change when
// someone keeps changing the item in Zotero.
const SEND_ATTEMPTS = 3;

// A problem that stops a sync.
class SyncStop extends Error {
  readonly problem: SyncProblem;

  constructor(problem: SyncProblem, options?: ErrorOptions) {
    super(`Zotero sync stopped: ${problem}`, options);
    this.name = "SyncStop";
    this.problem = problem;
  }
}

// What the sync does with one pending checkmark change.
interface Change {
  readonly itemKey: string;
  readonly checked: boolean;
}

// What a sync has sent so far: kept outside the Zotero calls so that a
// failure partway still records it.
interface Sent {
  // Each item whose checkmark Zotero now has as asked, with its tags then.
  readonly confirmed: Map<
    string,
    { checked: boolean; tags: readonly ZoteroTag[] }
  >;
  readonly skipped: Set<string>;
}

interface Sending extends Sent {
  readonly key: ZoteroKey;
  readonly collectionKey: string;
  readonly tag: string;
}

// The connection the owner's list syncs through: SyncStop when there is
// none, or it is to another Zotero account than the list's collection.
async function connectionFor(
  owner: UserId,
  zoteroUserId: string | undefined,
): Promise<ZoteroConnectionKey> {
  const key = await readZoteroKey(owner);
  if (key === undefined) {
    throw new SyncStop("access-ended");
  }
  if (zoteroUserId !== undefined && key.zoteroUserId !== zoteroUserId) {
    throw new SyncStop("other-account");
  }
  return key;
}

// The sync's problem for what Zotero answered; ends the owner's connection
// when Zotero refused the key.
async function problemOf(
  owner: UserId,
  key: ZoteroConnectionKey | undefined,
  error: unknown,
): Promise<SyncProblem> {
  if (error instanceof SyncStop) {
    return error.problem;
  }
  if (!(error instanceof ZoteroProblem)) {
    throw error;
  }
  if (error.kind === "access-ended") {
    if (key !== undefined) {
      await endZoteroConnection(owner, key.apiKey);
    }
    return "access-ended";
  }
  if (error.kind === "missing") {
    return "collection-missing";
  }
  return "zotero-unavailable";
}

function withCheckmark(
  tags: readonly ZoteroTag[],
  tag: string,
  checked: boolean,
): ZoteroTag[] {
  const others = tags.filter((each) => each.tag !== tag);
  if (checked) {
    return [...others, { tag }];
  }
  return others;
}

// Sends one change, reading the item again each time someone changed it
// first. Records the item as skipped when it left the collection.
async function sendChange(
  sending: Sending,
  change: Change,
  item: ZoteroItem | undefined,
  attempt: number,
): Promise<void> {
  if (item === undefined || !item.collections.includes(sending.collectionKey)) {
    sending.skipped.add(change.itemKey);
    return;
  }
  const has = item.tags.some(({ tag }) => tag === sending.tag);
  if (has === change.checked) {
    sending.confirmed.set(change.itemKey, {
      checked: change.checked,
      tags: item.tags,
    });
    return;
  }
  const tags = withCheckmark(item.tags, sending.tag, change.checked);
  if ((await writeTags(sending.key, item, tags)) === "saved") {
    sending.confirmed.set(change.itemKey, { checked: change.checked, tags });
    return;
  }
  if (attempt >= SEND_ATTEMPTS) {
    throw new ZoteroProblem("unavailable", { operation: "sendChange" });
  }
  await sendChange(
    sending,
    change,
    await readItem(sending.key, change.itemKey),
    attempt + 1,
  );
}

// Sends the changes one at a time, so that a failure leaves a clear record
// of the ones Zotero confirmed.
async function sendChanges(
  sending: Sending,
  items: ReadonlyMap<string, ZoteroItem>,
  changes: readonly Change[],
): Promise<void> {
  const [change, ...rest] = changes;
  if (change === undefined) {
    return;
  }
  await sendChange(sending, change, items.get(change.itemKey), 1);
  await sendChanges(sending, items, rest);
}

function syncedReferences(
  items: readonly ZoteroItem[],
  sent: Sent,
): SyncedReference[] {
  return inWorksCitedOrder(items).map((item) => {
    const tags = sent.confirmed.get(item.key)?.tags ?? item.tags;
    return {
      key: item.key,
      entry: item.entry,
      href: item.href,
      tags: tags.map(({ tag }) => tag),
    };
  });
}

function confirmedOf(sent: Sent): Map<string, boolean> {
  return new Map(
    [...sent.confirmed].map(([itemKey, { checked }]) => [itemKey, checked]),
  );
}

function emptySent(): Sent {
  return { confirmed: new Map(), skipped: new Set() };
}

// Reads the collection and sends the pending changes, recording each one
// Zotero confirmed or the sync skipped in sent as it goes.
async function runSync(
  start: SyncStart,
  key: ZoteroConnectionKey,
  sent: Sent,
): Promise<{
  readonly collectionName: string;
  readonly items: readonly ZoteroItem[];
}> {
  const collectionName = await readCollectionName(key, start.collectionKey);
  const items = await readCollectionItems(key, start.collectionKey);
  const changes = start.references.flatMap(({ itemKey, pending }) => {
    if (pending === undefined) {
      return [];
    }
    return [{ itemKey, checked: pending }];
  });
  const tag = start.checkmarkTag;
  if (changes.length === 0 || tag === undefined) {
    return { collectionName, items };
  }
  if (!key.writeAccess) {
    throw new SyncStop("no-write-access");
  }
  await sendChanges(
    { ...sent, key, collectionKey: start.collectionKey, tag },
    new Map(items.map((item) => [item.key, item])),
    changes,
  );
  return { collectionName, items };
}

// Syncs the owner's Zotero Collection list with its collection: reads its
// name and items, sends each pending checkmark change, and saves the
// result. "synced", or the problem that stopped it; "missing" when the list
// isn't the owner's.
async function syncZoteroList(
  owner: UserId,
  questId: QuestId,
  listId: ListId,
): Promise<"synced" | "missing" | SyncProblem> {
  const start = await beginZoteroSync(owner, questId, listId);
  if (start === "missing" || start === "already-syncing") {
    return start;
  }
  const sent = emptySent();
  let key: ZoteroConnectionKey | undefined;
  try {
    key = await connectionFor(owner, start.zoteroUserId);
    const { collectionName, items } = await runSync(start, key, sent);
    await finishZoteroSync(owner, start, {
      kind: "synced",
      collectionName,
      items: syncedReferences(items, sent),
      confirmed: confirmedOf(sent),
      skipped: sent.skipped,
    });
    return "synced";
  } catch (error) {
    let problem: SyncProblem = "zotero-unavailable";
    try {
      problem = await problemOf(owner, key, error);
    } finally {
      await finishZoteroSync(owner, start, {
        kind: "failed",
        problem,
        confirmed: confirmedOf(sent),
        skipped: sent.skipped,
      });
    }
    return problem;
  }
}

// Imports the collection from the owner's connected Zotero library as a new
// list at the end of their quest, checkable through the tag if one is
// given. The list's id, or the problem that stopped the import; "missing"
// when the quest isn't the owner's.
async function importZoteroCollection(
  owner: UserId,
  questId: QuestId,
  source: {
    readonly collectionKey: string;
    readonly checkmarkTag: string | undefined;
  },
): Promise<ListId | "missing" | SyncProblem> {
  let key: ZoteroConnectionKey | undefined;
  try {
    key = await connectionFor(owner, undefined);
    if (source.checkmarkTag !== undefined && !key.writeAccess) {
      return "no-write-access";
    }
    const collectionName = await readCollectionName(key, source.collectionKey);
    const items = await readCollectionItems(key, source.collectionKey);
    const listId = await insertZoteroList(
      owner,
      questId,
      {
        zoteroUserId: key.zoteroUserId,
        collectionKey: source.collectionKey,
        collectionName,
        checkmarkTag: source.checkmarkTag,
      },
      syncedReferences(items, emptySent()),
    );
    return listId ?? "missing";
  } catch (error) {
    return problemOf(owner, key, error);
  }
}

export { importZoteroCollection, syncZoteroList };
