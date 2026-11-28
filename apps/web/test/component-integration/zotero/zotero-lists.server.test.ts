// Zotero Collection lists against the test database and the run's fake
// Zotero (test/support/zotero/fake-zotero.ts): connecting through OAuth,
// importing a collection, syncing it, marking its references, changing its
// checkmark tag and recovering it, with who in a quest may do what.
import { describe, expect, test, vi } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import { GET as zoteroCallback } from "@/app/api/zotero/callback/route.ts";
import { readExperience } from "@/experience/experience-store.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { newPerformanceId } from "@/ids.ts";
import { LIST_ID, type ListId } from "@/lists/list.ts";
import { writeListContents } from "@/lists/list-item-store.ts";
import { readLists } from "@/lists/list-store.ts";
import { listQuickAddQuests } from "@/lists/quick-add-actions.ts";
import { startPerformance } from "@/performances/performance-store.ts";
import { plainText } from "@/zotero/works-cited.ts";
import type { ZoteroReferenceId } from "@/zotero/zotero.ts";
import {
  beginZoteroConnection,
  disconnectZotero,
  readZoteroSetup,
} from "@/zotero/zotero-connection.ts";
import {
  readZoteroConnection,
  readZoteroKey,
} from "@/zotero/zotero-connection-store.ts";
import {
  discardZoteroChanges,
  markZoteroReference,
  readZoteroList,
  removeZoteroList,
  saveZoteroListSettings,
  type ZoteroList,
} from "@/zotero/zotero-list-store.ts";
import {
  importZoteroCollection,
  syncZoteroList,
} from "@/zotero/zotero-sync.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import {
  addZoteroCollection,
  addZoteroItem,
  answerZoteroAuthorization,
  deleteZoteroCollection,
  editZoteroItem,
  failZoteroAfter,
  holdZoteroItems,
  interfereWithZoteroItem,
  recoverZotero,
  releaseZoteroItems,
  renameZoteroCollection,
  revokeZoteroKey,
  zoteroItemNow,
  zoteroItemsHeld,
  zoteroKeyLive,
  zoteroTagWrites,
} from "../../support/zotero/fake-zotero-kit.ts";
import {
  addInvitee,
  addMember,
  addRemovedMember,
} from "../quests/quest-members-test-kit.ts";
import {
  requestWithSession,
  signIn,
} from "../test-database/session-test-kit.ts";
import type { SendEmail } from "../test-database/sign-in-link-test-kit.ts";
import {
  bookBib,
  connectZotero,
  fakeZoteroOrigin,
  type ZoteroQuest,
  zoteroAccount,
  zoteroListOf,
  zoteroQuest,
} from "./zotero-test-kit.ts";

const sent = vi.hoisted(() => ({ sendEmail: vi.fn<SendEmail>() }));
vi.mock("@/email/send-email.ts", () => sent);

const SITE = "http://localhost:3494";
const READ = "read";
const ITEM_PAGE = /\/items\/[A-Z0-9]{8}$/u;

function entriesOf(zotero: ZoteroList): string[] {
  return zotero.references.map(({ entry }) => plainText(entry));
}

// The reference whose entry starts with author.
function referenceBy(
  zotero: ZoteroList,
  author: string,
): ZoteroList["references"][number] {
  const reference = zotero.references.find(({ entry }) =>
    plainText(entry).startsWith(author),
  );
  if (reference === undefined) {
    throw new Error(`No reference by ${author}`);
  }
  return reference;
}

function mark(
  user: User,
  quest: ZoteroQuest,
  referenceId: ZoteroReferenceId,
  checked: boolean,
): Promise<"saved" | "missing" | "closed"> {
  return markZoteroReference(
    user.id,
    { questId: quest.questId, listId: quest.listId, referenceId },
    checked,
  );
}

function sync(quest: ZoteroQuest): ReturnType<typeof syncZoteroList> {
  return syncZoteroList(quest.owner.id, quest.questId, quest.listId);
}

// The tags of the item as the fake Zotero holds it.
async function tagsOf(quest: ZoteroQuest, itemKey: string): Promise<string[]> {
  const item = await zoteroItemNow(
    fakeZoteroOrigin(),
    quest.account.zoteroUserId,
    itemKey,
  );
  return (item?.tags ?? []).map(({ tag }) => tag);
}

const THREE_BOOKS = [
  { bib: bookBib("Zola, Émile", "Germinal") },
  { bib: bookBib("Austen, Jane", "Emma") },
  { bib: bookBib("Morrison, Toni", "Beloved") },
];

test("use_case_connect_zotero", async () => {
  const owner = await testUser();
  const account = await zoteroAccount();
  const origin = fakeZoteroOrigin();
  expect(await readZoteroSetup(owner.id)).toEqual({ kind: "not-connected" });

  // Declining on Zotero's page returns to setup, which offers Connect again.
  const started = await beginZoteroConnection(owner.id, {
    origin: SITE,
    returnTo: "/quests/a-quest?section=zotero",
    write: false,
  });
  if (started.kind !== "authorize") {
    throw new Error(started.kind);
  }
  const declined = await answerZoteroAuthorization(
    started.url,
    account.username,
    "deny",
  );
  expect(declined.origin + declined.pathname).toBe(
    `${SITE}/api/zotero/callback`,
  );
  await signIn(owner);
  const back = await zoteroCallback(requestWithSession(declined.toString()));
  expect(back.status).toBe(HTTP_STATUS.seeOther);
  const returned = new URL(back.headers.get("location") ?? "");
  expect(returned.pathname).toBe("/quests/a-quest");
  expect(returned.searchParams.get("section")).toBe("zotero");
  expect(returned.searchParams.get("zotero")).toBe("failed");
  expect(await readZoteroConnection(owner.id)).toBeUndefined();

  // Accepting connects the account and lists its collections, nested.
  const first = await connectZotero(owner, account, false);
  expect(await readZoteroConnection(owner.id)).toEqual({
    username: account.username,
    writeAccess: false,
  });
  const parent = await addZoteroCollection(
    origin,
    account.zoteroUserId,
    "Sources",
  );
  await addZoteroCollection(origin, account.zoteroUserId, "Primary", parent);
  await addZoteroCollection(origin, account.zoteroUserId, "Articles");
  expect(await readZoteroSetup(owner.id)).toMatchObject({
    kind: "connected",
    connection: { username: account.username, writeAccess: false },
    collections: [
      { name: "Articles", children: [] },
      { name: "Sources", children: [{ name: "Primary", children: [] }] },
    ],
  });

  // Connecting again for write access revokes the earlier key at Zotero.
  const second = await connectZotero(owner, account, true);
  expect(await zoteroKeyLive(origin, first)).toBe(false);
  expect(await readZoteroConnection(owner.id)).toMatchObject({
    writeAccess: true,
  });

  // Disconnecting revokes the key too.
  await disconnectZotero(owner.id);
  expect(await zoteroKeyLive(origin, second)).toBe(false);
  expect(await readZoteroSetup(owner.id)).toEqual({ kind: "not-connected" });
});

test("the Zotero callback sends a signed-out visitor to sign in", async () => {
  const response = await zoteroCallback(
    new Request("http://localhost/api/zotero/callback?oauth_token=abc"),
  );
  expect(response.status).toBe(HTTP_STATUS.seeOther);
  expect(new URL(response.headers.get("location") ?? "").pathname).toBe(
    "/login",
  );
});

test("use_case_create_zotero_collection_list", async () => {
  const owner = await testUser();
  const quest = await zoteroQuest(owner, {
    items: [
      ...THREE_BOOKS,
      { bib: "A note", itemType: "note" },
      { bib: "An attachment", itemType: "attachment" },
    ],
  });
  const zotero = await zoteroListOf(owner, quest);
  expect(zotero.list).toMatchObject({
    name: "Reading",
    type: "zotero-collection",
  });
  // One entry per bibliographic item, in Works Cited order, with italics.
  expect(entriesOf(zotero)).toEqual([
    "Austen, Jane. Emma. Example Press, 2020.",
    "Morrison, Toni. Beloved. Example Press, 2020.",
    "Zola, Émile. Germinal. Example Press, 2020.",
  ]);
  expect(zotero.references[0]?.entry).toContainEqual({
    text: "Emma",
    italic: true,
  });
  expect(zotero.references[0]?.href).toMatch(ITEM_PAGE);
  expect(zotero).toMatchObject({
    checkmarkTag: undefined,
    checkmarksShown: false,
    markable: false,
    pending: 0,
    unavailable: undefined,
  });
  const lists = await readLists(owner.id, quest.questId);
  expect(lists.at(-1)?.id).toBe(quest.listId);

  // The list takes no list items, Quick Add or performances.
  expect(
    (
      await writeListContents(owner.id, quest.questId, quest.listId, {
        kind: "add",
        text: "A new task",
      })
    ).result,
  ).toBe("missing");
  await signIn(owner);
  const [target] = (await listQuickAddQuests()).filter(
    ({ id }) => id === quest.questId,
  );
  expect(target?.lists.map(({ id }) => id)).not.toContain(quest.listId);
  expect(
    await startPerformance(owner.id, quest.questId, {
      id: newPerformanceId(),
      listId: quest.listId,
      riteId: "capture",
    }),
  ).toBeUndefined();

  // An empty collection makes an empty list; a subcollection its own list.
  const origin = fakeZoteroOrigin();
  const { zoteroUserId } = quest.account;
  const empty = await addZoteroCollection(origin, zoteroUserId, "Later");
  const nested = await addZoteroCollection(
    origin,
    zoteroUserId,
    "Chapter 1",
    quest.collectionKey,
  );
  await addZoteroItem(origin, zoteroUserId, {
    collections: [nested],
    bib: bookBib("Baldwin, James", "Giovanni's Room"),
  });
  const emptyList = LIST_ID.parse(
    await importZoteroCollection(owner.id, quest.questId, {
      collectionKey: empty,
      checkmarkTag: undefined,
    }),
  );
  const nestedList = LIST_ID.parse(
    await importZoteroCollection(owner.id, quest.questId, {
      collectionKey: nested,
      checkmarkTag: undefined,
    }),
  );
  const [, , ...added] = await readLists(owner.id, quest.questId);
  expect(added.map(({ name }) => name)).toEqual([
    "Reading",
    "Later",
    "Chapter 1",
  ]);
  expect(
    entriesOf(
      await zoteroListOf(owner, { questId: quest.questId, listId: nestedList }),
    ),
  ).toEqual(["Baldwin, James. Giovanni's Room. Example Press, 2020."]);
  expect(
    (await zoteroListOf(owner, { questId: quest.questId, listId: emptyList }))
      .references,
  ).toEqual([]);

  // A checkable list needs write access, and a missing collection fails.
  await connectZotero(owner, quest.account, false);
  expect(
    await importZoteroCollection(owner.id, quest.questId, {
      collectionKey: empty,
      checkmarkTag: READ,
    }),
  ).toBe("no-write-access");
  expect(
    await importZoteroCollection(owner.id, quest.questId, {
      collectionKey: "ZZZZZZZZ",
      checkmarkTag: undefined,
    }),
  ).toBe("collection-missing");
  expect(await readLists(owner.id, quest.questId)).toHaveLength(
    lists.length + 2,
  );
});

test("a checkable list reads Zotero's checkmarks when imported", async () => {
  const owner = await testUser();
  const quest = await zoteroQuest(owner, {
    items: [
      { bib: bookBib("Austen, Jane", "Emma"), tags: [{ tag: READ }] },
      { bib: bookBib("Zola, Émile", "Germinal"), tags: [{ tag: "novel" }] },
    ],
    tag: READ,
  });
  const zotero = await zoteroListOf(owner, quest);
  expect(zotero).toMatchObject({
    checkmarkTag: READ,
    checkmarksShown: true,
    markable: true,
  });
  expect(zotero.references.map(({ checked }) => checked)).toEqual([
    true,
    false,
  ]);
});

describe("Zotero Collection list access", () => {
  test("the quest's members share marks; only the owner configures and syncs", async () => {
    const [owner, member, invitee, removed, stranger] = await Promise.all([
      testUser(),
      testUser(),
      testUser(),
      testUser(),
      testUser(),
    ]);
    const quest = await zoteroQuest(owner, { items: THREE_BOOKS, tag: READ });
    await addMember(owner, quest.questId, member);
    await addInvitee(owner, quest.questId, invitee);
    await addRemovedMember(owner, quest.questId, removed);
    const where = { questId: quest.questId, listId: quest.listId };
    const emma = referenceBy(await zoteroListOf(owner, quest), "Austen");

    expect(await mark(member, quest, emma.id, true)).toBe("saved");
    const seen = await zoteroListOf(owner, quest);
    expect(referenceBy(seen, "Austen").pending).toBe(true);
    expect(
      referenceBy(await zoteroListOf(member, quest), "Austen").pending,
    ).toBe(true);

    const outsiders = [invitee, removed, stranger];
    expect(
      await Promise.all(
        outsiders.map(async (outsider) => ({
          list: await readZoteroList(outsider.id, quest.questId, quest.listId),
          mark: await mark(outsider, quest, emma.id, false),
        })),
      ),
    ).toEqual(outsiders.map(() => ({ list: undefined, mark: "missing" })));

    // A member may mark but not sync, set up, discard or remove the list.
    const others = [member, ...outsiders];
    expect(
      await Promise.all(
        others.map(async (user) => ({
          sync: await syncZoteroList(user.id, quest.questId, quest.listId),
          settings: await saveZoteroListSettings(user.id, where, {
            name: "Taken",
            checkmarkTag: undefined,
          }),
          discard: await discardZoteroChanges(
            user.id,
            quest.questId,
            quest.listId,
          ),
          remove: await removeZoteroList(user.id, quest.questId, quest.listId),
          import: await importZoteroCollection(user.id, quest.questId, {
            collectionKey: quest.collectionKey,
            checkmarkTag: undefined,
          }),
        })),
      ),
    ).toEqual(
      others.map(() => ({
        sync: "missing",
        settings: "missing",
        discard: false,
        remove: false,
        // None of them connected Zotero.
        import: "access-ended",
      })),
    );
    expect(
      await zoteroTagWrites(fakeZoteroOrigin(), quest.account.zoteroUserId),
    ).toEqual([]);
    expect((await zoteroListOf(owner, quest)).pending).toBe(1);

    // A member's own Zotero connection imports nothing into the quest.
    const theirs = await zoteroAccount();
    await connectZotero(member, theirs, false);
    expect((await readZoteroKey(member.id))?.zoteroUserId).toBe(
      theirs.zoteroUserId,
    );
    expect(
      await importZoteroCollection(member.id, quest.questId, {
        collectionKey: await addZoteroCollection(
          fakeZoteroOrigin(),
          theirs.zoteroUserId,
          "Mine",
        ),
        checkmarkTag: undefined,
      }),
    ).toBe("missing");
  });
});

describe("use_case_sync_zotero_collection_list", () => {
  test("a sync picks up additions, edits, removals and renames", async () => {
    const owner = await testUser();
    const quest = await zoteroQuest(owner, { items: THREE_BOOKS });
    const origin = fakeZoteroOrigin();
    const { zoteroUserId } = quest.account;
    const [zola, austen, morrison] = quest.itemKeys;
    const before = await zoteroListOf(owner, quest);
    const emma = referenceBy(before, "Austen");

    await addZoteroItem(origin, zoteroUserId, {
      collections: [quest.collectionKey],
      bib: bookBib("Baldwin, James", "Giovanni's Room"),
    });
    // Two distinct items with the same citation each appear.
    await addZoteroItem(origin, zoteroUserId, {
      collections: [quest.collectionKey],
      bib: bookBib("Baldwin, James", "Giovanni's Room"),
    });
    await editZoteroItem(origin, zoteroUserId, austen ?? "", {
      bib: bookBib("Austen, Jane", "Emma: A Novel"),
    });
    await editZoteroItem(origin, zoteroUserId, morrison ?? "", {
      collections: [],
    });
    await renameZoteroCollection(
      origin,
      zoteroUserId,
      quest.collectionKey,
      "Reading list",
    );
    expect(await sync(quest)).toBe("synced");

    const after = await zoteroListOf(owner, quest);
    expect(entriesOf(after)).toEqual([
      "Austen, Jane. Emma: A Novel. Example Press, 2020.",
      "Baldwin, James. Giovanni's Room. Example Press, 2020.",
      "Baldwin, James. Giovanni's Room. Example Press, 2020.",
      "Zola, Émile. Germinal. Example Press, 2020.",
    ]);
    // The retitled work keeps its identity.
    expect(referenceBy(after, "Austen").id).toBe(emma.id);
    expect(new Set(after.references.map(({ id }) => id)).size).toBe(
      after.references.length,
    );
    expect(after.list.name).toBe("Reading list");
    expect(after.collectionName).toBe("Reading list");
    expect(after.lastSync).toMatchObject({
      kind: "synced",
      sent: 0,
      skipped: [],
      waiting: 0,
    });
    expect(after.syncedAt.getTime()).toBeGreaterThanOrEqual(
      before.syncedAt.getTime(),
    );
    expect(zola).toBeDefined();

    // A custom name stays through later renames.
    expect(
      await saveZoteroListSettings(
        owner.id,
        { questId: quest.questId, listId: quest.listId },
        { name: "Thesis sources", checkmarkTag: undefined },
      ),
    ).toBe("saved");
    await renameZoteroCollection(
      origin,
      zoteroUserId,
      quest.collectionKey,
      "Old reading",
    );
    expect(await sync(quest)).toBe("synced");
    const renamed = await zoteroListOf(owner, quest);
    expect(renamed.list.name).toBe("Thesis sources");
    expect(renamed.collectionName).toBe("Old reading");
  });

  test("Sync sends pending checkmarks and keeps the item's other tags", async () => {
    const owner = await testUser();
    const quest = await zoteroQuest(owner, {
      items: [
        {
          bib: bookBib("Austen, Jane", "Emma"),
          tags: [{ tag: "novel" }, { tag: "auto", type: 1 }],
        },
        { bib: bookBib("Zola, Émile", "Germinal"), tags: [{ tag: READ }] },
      ],
      tag: READ,
    });
    const [austen, zola] = quest.itemKeys;
    const zotero = await zoteroListOf(owner, quest);
    expect(
      await mark(owner, quest, referenceBy(zotero, "Austen").id, true),
    ).toBe("saved");
    expect(
      await mark(owner, quest, referenceBy(zotero, "Zola").id, false),
    ).toBe("saved");
    expect((await zoteroListOf(owner, quest)).pending).toBe(2);

    expect(await sync(quest)).toBe("synced");
    expect(await tagsOf(quest, austen ?? "")).toEqual(["novel", "auto", READ]);
    expect(await tagsOf(quest, zola ?? "")).toEqual([]);
    const item = await zoteroItemNow(
      fakeZoteroOrigin(),
      quest.account.zoteroUserId,
      austen ?? "",
    );
    expect(item?.title).toBe("A work");
    const after = await zoteroListOf(owner, quest);
    expect(after.pending).toBe(0);
    expect(after.references.map(({ checked }) => checked)).toEqual([
      true,
      false,
    ]);
    expect(after.lastSync).toMatchObject({ kind: "synced", sent: 2 });
  });

  test("a concurrent Zotero edit is read again before the change is retried", async () => {
    const owner = await testUser();
    const quest = await zoteroQuest(owner, {
      items: [{ bib: bookBib("Austen, Jane", "Emma") }],
      tag: READ,
    });
    const [austen = ""] = quest.itemKeys;
    const zotero = await zoteroListOf(owner, quest);
    await mark(owner, quest, referenceBy(zotero, "Austen").id, true);
    await interfereWithZoteroItem(
      fakeZoteroOrigin(),
      quest.account.zoteroUserId,
      austen,
      { tags: [{ tag: "added in Zotero" }] },
    );

    expect(await sync(quest)).toBe("synced");
    expect(await tagsOf(quest, austen)).toEqual(["added in Zotero", READ]);
    expect(
      await zoteroTagWrites(fakeZoteroOrigin(), quest.account.zoteroUserId),
    ).toEqual([{ itemKey: austen, tags: ["added in Zotero", READ] }]);
  });

  test("an item that left the collection is skipped and left alone", async () => {
    const owner = await testUser();
    const quest = await zoteroQuest(owner, {
      items: [
        { bib: bookBib("Austen, Jane", "Emma") },
        { bib: bookBib("Zola, Émile", "Germinal") },
      ],
      tag: READ,
    });
    const [austen = ""] = quest.itemKeys;
    const zotero = await zoteroListOf(owner, quest);
    await mark(owner, quest, referenceBy(zotero, "Austen").id, true);
    await editZoteroItem(
      fakeZoteroOrigin(),
      quest.account.zoteroUserId,
      austen,
      {
        collections: [],
      },
    );

    expect(await sync(quest)).toBe("synced");
    expect(await tagsOf(quest, austen)).toEqual([]);
    const after = await zoteroListOf(owner, quest);
    expect(entriesOf(after)).toEqual([
      "Zola, Émile. Germinal. Example Press, 2020.",
    ]);
    expect(after.lastSync).toMatchObject({
      kind: "synced",
      sent: 0,
      skipped: [
        { key: austen, text: "Austen, Jane. Emma. Example Press, 2020." },
      ],
    });
  });

  test("marks made during a sync wait for the next sync when they differ", async () => {
    const [owner, member] = await Promise.all([testUser(), testUser()]);
    const quest = await zoteroQuest(owner, {
      items: [
        { bib: bookBib("Austen, Jane", "Emma") },
        { bib: bookBib("Morrison, Toni", "Beloved") },
        { bib: bookBib("Zola, Émile", "Germinal") },
      ],
      tag: READ,
    });
    await addMember(owner, quest.questId, member);
    const origin = fakeZoteroOrigin();
    const { zoteroUserId } = quest.account;
    const [, morrison = ""] = quest.itemKeys;
    const zotero = await zoteroListOf(owner, quest);
    const austen = referenceBy(zotero, "Austen");
    const beloved = referenceBy(zotero, "Morrison");
    const zola = referenceBy(zotero, "Zola");
    await mark(owner, quest, austen.id, true);
    // Someone tags Beloved in Zotero, which this sync reads.
    await editZoteroItem(origin, zoteroUserId, morrison, {
      tags: [{ tag: READ }],
    });

    await holdZoteroItems(origin, zoteroUserId);
    const running = sync(quest);
    await zoteroItemsHeld(origin, zoteroUserId);
    expect(await sync(quest)).toBe("already-syncing");
    expect(await mark(member, quest, austen.id, false)).toBe("saved");
    expect(await mark(member, quest, beloved.id, true)).toBe("saved");
    expect(await mark(member, quest, zola.id, true)).toBe("saved");
    await releaseZoteroItems(origin, zoteroUserId);
    expect(await running).toBe("synced");

    const after = await zoteroListOf(owner, quest);
    // The sync sent Emma's checkmark; the member's later uncheck waits.
    expect(referenceBy(after, "Austen")).toMatchObject({
      checked: true,
      pending: false,
    });
    // Beloved is checked in Zotero now, as the member's mark asked.
    expect(referenceBy(after, "Morrison")).toMatchObject({
      checked: true,
      pending: undefined,
    });
    expect(referenceBy(after, "Zola")).toMatchObject({
      checked: false,
      pending: true,
    });
    expect(after.lastSync).toMatchObject({
      kind: "synced",
      sent: 1,
      waiting: 2,
    });
    expect(after.pending).toBe(2);
  });

  test("a failed sync keeps the references and tells sent from waiting", async () => {
    const owner = await testUser();
    const quest = await zoteroQuest(owner, {
      items: [
        { bib: bookBib("Austen, Jane", "Emma") },
        { bib: bookBib("Zola, Émile", "Germinal") },
      ],
      tag: READ,
    });
    const origin = fakeZoteroOrigin();
    const { zoteroUserId } = quest.account;
    const zotero = await zoteroListOf(owner, quest);
    await mark(owner, quest, referenceBy(zotero, "Austen").id, true);
    await mark(owner, quest, referenceBy(zotero, "Zola").id, true);
    await addZoteroItem(origin, zoteroUserId, {
      collections: [quest.collectionKey],
      bib: bookBib("Baldwin, James", "Giovanni's Room"),
    });
    await failZoteroAfter(origin, zoteroUserId, 1);

    expect(await sync(quest)).toBe("zotero-unavailable");
    const failed = await zoteroListOf(owner, quest);
    expect(entriesOf(failed)).toEqual(entriesOf(zotero));
    expect(failed.syncedAt).toEqual(zotero.syncedAt);
    expect(failed.lastSync).toMatchObject({
      kind: "failed",
      problem: "zotero-unavailable",
      sent: 1,
      waiting: 1,
    });
    expect(referenceBy(failed, "Austen")).toMatchObject({
      checked: true,
      pending: undefined,
    });
    expect(referenceBy(failed, "Zola").pending).toBe(true);
    expect(failed.unavailable).toBeUndefined();
    expect(failed.markable).toBe(true);

    // Sync again sends the rest once Zotero answers.
    await recoverZotero(origin, zoteroUserId);
    expect(await sync(quest)).toBe("synced");
    const after = await zoteroListOf(owner, quest);
    expect(after.pending).toBe(0);
    expect(after.references).toHaveLength(zotero.references.length + 1);
    expect(after.lastSync).toMatchObject({ kind: "synced", sent: 1 });
  });

  test("a sync with waiting changes needs write access", async () => {
    const owner = await testUser();
    const quest = await zoteroQuest(owner, {
      items: [{ bib: bookBib("Austen, Jane", "Emma") }],
      tag: READ,
    });
    const zotero = await zoteroListOf(owner, quest);
    await mark(owner, quest, referenceBy(zotero, "Austen").id, true);
    await connectZotero(owner, quest.account, false);

    expect(await sync(quest)).toBe("no-write-access");
    const after = await zoteroListOf(owner, quest);
    expect(after.pending).toBe(1);
    expect(after.lastSync).toMatchObject({
      kind: "failed",
      problem: "no-write-access",
    });
  });
});

describe("use_case_check_zotero_reference", () => {
  test("the last mark wins, and marking back clears the change", async () => {
    const [owner, member] = await Promise.all([testUser(), testUser()]);
    const quest = await zoteroQuest(owner, {
      items: [{ bib: bookBib("Austen, Jane", "Emma") }],
      tag: READ,
    });
    await addMember(owner, quest.questId, member);
    const { id } = referenceBy(await zoteroListOf(owner, quest), "Austen");
    const { experience } = await readExperience(owner.id);

    await mark(owner, quest, id, true);
    await mark(member, quest, id, false);
    expect(
      referenceBy(await zoteroListOf(owner, quest), "Austen"),
    ).toMatchObject({ checked: false, pending: undefined });
    await mark(member, quest, id, true);
    expect(
      referenceBy(await zoteroListOf(member, quest), "Austen").pending,
    ).toBe(true);
    expect((await readExperience(owner.id)).experience).toBe(experience);
    expect((await readExperience(member.id)).experience).toBe(0);
    expect(
      await zoteroTagWrites(fakeZoteroOrigin(), quest.account.zoteroUserId),
    ).toEqual([]);
  });

  test("lists that share a tag each apply their own changes", async () => {
    const owner = await testUser();
    const quest = await zoteroQuest(owner, {
      items: [{ bib: bookBib("Austen, Jane", "Emma"), tags: [{ tag: READ }] }],
      tag: READ,
    });
    const origin = fakeZoteroOrigin();
    const { zoteroUserId } = quest.account;
    const [austen = ""] = quest.itemKeys;
    // The same item, untagged by now, in a second list with the same tag.
    const other = await addZoteroCollection(origin, zoteroUserId, "Novels");
    await editZoteroItem(origin, zoteroUserId, austen, {
      collections: [quest.collectionKey, other],
      tags: [],
    });
    const second: ZoteroQuest = {
      ...quest,
      listId: listIdOf(
        await importZoteroCollection(owner.id, quest.questId, {
          collectionKey: other,
          checkmarkTag: READ,
        }),
      ),
    };
    const first = referenceBy(await zoteroListOf(owner, quest), "Austen");
    const twin = referenceBy(await zoteroListOf(owner, second), "Austen");
    expect([first.checked, twin.checked]).toEqual([true, false]);

    // Opposing changes: each sync applies its own list's, and the latest
    // one sets the tag.
    await mark(owner, quest, first.id, false);
    await mark(owner, second, twin.id, true);
    expect(await sync(second)).toBe("synced");
    expect(await tagsOf(quest, austen)).toEqual([READ]);
    expect(await sync(quest)).toBe("synced");
    expect(await tagsOf(quest, austen)).toEqual([]);

    // The list with no change waiting picks up the tag on its next sync.
    expect(
      referenceBy(await zoteroListOf(owner, second), "Austen").checked,
    ).toBe(true);
    expect(await sync(second)).toBe("synced");
    expect(
      referenceBy(await zoteroListOf(owner, second), "Austen"),
    ).toMatchObject({ checked: false, pending: undefined });
  });
});

function listIdOf(imported: string): ListId {
  const { data } = LIST_ID.safeParse(imported);
  if (data === undefined) {
    throw new Error(`Importing answered ${imported}`);
  }
  return data;
}

describe("use_case_change_zotero_checkmark_tag", () => {
  test("changing the tag waits for pending changes and leaves Zotero alone", async () => {
    const owner = await testUser();
    const quest = await zoteroQuest(owner, {
      items: [
        { bib: bookBib("Austen, Jane", "Emma"), tags: [{ tag: READ }] },
        { bib: bookBib("Zola, Émile", "Germinal"), tags: [{ tag: "cited" }] },
      ],
      tag: READ,
    });
    const where = { questId: quest.questId, listId: quest.listId };
    const zotero = await zoteroListOf(owner, quest);
    await mark(owner, quest, referenceBy(zotero, "Zola").id, true);

    expect(
      await saveZoteroListSettings(owner.id, where, {
        name: "Reading",
        checkmarkTag: "cited",
      }),
    ).toBe("pending");
    expect(
      await discardZoteroChanges(owner.id, quest.questId, quest.listId),
    ).toBe(true);
    expect((await zoteroListOf(owner, quest)).pending).toBe(0);
    expect(
      await saveZoteroListSettings(owner.id, where, {
        name: "Reading",
        checkmarkTag: "cited",
      }),
    ).toBe("saved");

    // Until a sync reads the new tag, the list shows no checkmarks.
    const saved = await zoteroListOf(owner, quest);
    expect(saved).toMatchObject({
      checkmarkTag: "cited",
      checkmarksShown: false,
      markable: false,
    });
    expect(await mark(owner, quest, referenceBy(saved, "Zola").id, false)).toBe(
      "closed",
    );
    expect(
      await zoteroTagWrites(fakeZoteroOrigin(), quest.account.zoteroUserId),
    ).toEqual([]);
    expect(await sync(quest)).toBe("synced");
    const read = await zoteroListOf(owner, quest);
    expect(read.markable).toBe(true);
    expect(read.references.map(({ checked }) => checked)).toEqual([
      false,
      true,
    ]);

    // Turning Checkable off removes the checkmarks.
    expect(
      await saveZoteroListSettings(owner.id, where, {
        name: "Reading",
        checkmarkTag: undefined,
      }),
    ).toBe("saved");
    expect(await zoteroListOf(owner, quest)).toMatchObject({
      checkmarkTag: undefined,
      checkmarksShown: false,
    });
    expect(await tagsOf(quest, quest.itemKeys[1] ?? "")).toEqual(["cited"]);

    // A tag needs a connection that may change the library.
    await connectZotero(owner, quest.account, false);
    expect(
      await saveZoteroListSettings(owner.id, where, {
        name: "Reading",
        checkmarkTag: READ,
      }),
    ).toBe("needs-write");
  });
});

describe("use_case_recover_zotero_collection_list", () => {
  test("a revoked key closes marks until the owner reconnects and syncs", async () => {
    const owner = await testUser();
    const quest = await zoteroQuest(owner, {
      items: [
        { bib: bookBib("Austen, Jane", "Emma") },
        { bib: bookBib("Zola, Émile", "Germinal") },
      ],
      tag: READ,
    });
    const zotero = await zoteroListOf(owner, quest);
    const emma = referenceBy(zotero, "Austen");
    await mark(owner, quest, emma.id, true);
    await revokeZoteroKey(fakeZoteroOrigin(), quest.apiKey);

    expect(await sync(quest)).toBe("access-ended");
    expect(await readZoteroConnection(owner.id)).toBeUndefined();
    const closed = await zoteroListOf(owner, quest);
    expect(closed).toMatchObject({
      unavailable: "access-ended",
      checkmarksShown: true,
      markable: false,
      pending: 1,
    });
    expect(entriesOf(closed)).toEqual(entriesOf(zotero));
    expect(await mark(owner, quest, referenceBy(closed, "Zola").id, true)).toBe(
      "closed",
    );

    await connectZotero(owner, quest.account, true);
    expect(await sync(quest)).toBe("synced");
    const restored = await zoteroListOf(owner, quest);
    expect(restored).toMatchObject({ unavailable: undefined, markable: true });
    expect(referenceBy(restored, "Austen").checked).toBe(true);
    expect(
      await mark(owner, quest, referenceBy(restored, "Zola").id, true),
    ).toBe("saved");
  });

  test("disconnecting, another account or a deleted collection make the list unavailable", async () => {
    const owner = await testUser();
    const quest = await zoteroQuest(owner, {
      items: [{ bib: bookBib("Austen, Jane", "Emma") }],
      tag: READ,
    });
    const origin = fakeZoteroOrigin();
    const emma = referenceBy(await zoteroListOf(owner, quest), "Austen");
    await mark(owner, quest, emma.id, true);

    await disconnectZotero(owner.id);
    expect((await zoteroListOf(owner, quest)).unavailable).toBe("access-ended");
    expect(await sync(quest)).toBe("access-ended");

    await connectZotero(owner, await zoteroAccount(), true);
    expect(await sync(quest)).toBe("other-account");
    expect((await zoteroListOf(owner, quest)).unavailable).toBe(
      "other-account",
    );

    await connectZotero(owner, quest.account, true);
    await deleteZoteroCollection(
      origin,
      quest.account.zoteroUserId,
      quest.collectionKey,
    );
    expect(await sync(quest)).toBe("collection-missing");
    const missing = await zoteroListOf(owner, quest);
    expect(missing).toMatchObject({
      unavailable: "collection-missing",
      pending: 1,
    });
    expect(entriesOf(missing)).toEqual([
      "Austen, Jane. Emma. Example Press, 2020.",
    ]);

    // Removing the list drops its pending change and leaves Zotero alone.
    expect(await removeZoteroList(owner.id, quest.questId, quest.listId)).toBe(
      true,
    );
    expect(
      (await readLists(owner.id, quest.questId)).map(({ id }) => id),
    ).not.toContain(quest.listId);
    expect(await zoteroTagWrites(origin, quest.account.zoteroUserId)).toEqual(
      [],
    );
    expect(await tagsOf(quest, quest.itemKeys[0] ?? "")).toEqual([]);
  });
});
