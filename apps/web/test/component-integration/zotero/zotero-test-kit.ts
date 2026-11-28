// Zotero Collection lists in a server test: a Zotero account of the test's
// own in the run's fake Zotero (test/support/zotero/fake-zotero.ts),
// connected through the OAuth flow the site uses, and a quest with a list
// imported from one of its collections.
import { inject } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import type { QuestId } from "@/ids.ts";
import { LIST_ID, type ListId } from "@/lists/list.ts";
import { QUEST_NAME } from "@/quests/quest-name.ts";
import { createQuest } from "@/quests/store.ts";
import {
  beginZoteroConnection,
  finishZoteroConnection,
} from "@/zotero/zotero-connection.ts";
import { readZoteroKey } from "@/zotero/zotero-connection-store.ts";
import { readZoteroList, type ZoteroList } from "@/zotero/zotero-list-store.ts";
import { importZoteroCollection } from "@/zotero/zotero-sync.ts";
import {
  addZoteroCollection,
  addZoteroItem,
  addZoteroUser,
  answerZoteroAuthorization,
  type FakeItemSeed,
} from "../../support/zotero/fake-zotero-kit.ts";

const SITE = "http://localhost:3494";

// The run's fake Zotero.
function fakeZoteroOrigin(): string {
  return inject("zoteroOrigin");
}

// A Zotero account in the fake: its user ID and username.
interface ZoteroAccount {
  readonly zoteroUserId: string;
  readonly username: string;
}

async function zoteroAccount(): Promise<ZoteroAccount> {
  const username = `reader-${crypto.randomUUID()}`;
  return {
    zoteroUserId: await addZoteroUser(fakeZoteroOrigin(), username),
    username,
  };
}

// Connects the user's Project Buddy account to the Zotero account through
// OAuth, as Connect Zotero and accepting on Zotero's page do, with
// permission to change the library when write is true. The API key the
// site saved.
async function connectZotero(
  user: User,
  account: ZoteroAccount,
  write: boolean,
): Promise<string> {
  const started = await beginZoteroConnection(user.id, {
    origin: SITE,
    returnTo: "/quests",
    write,
  });
  if (started.kind !== "authorize") {
    throw new Error(`Connecting Zotero answered ${started.kind}`);
  }
  const back = await answerZoteroAuthorization(
    started.url,
    account.username,
    "accept",
  );
  const returned = await finishZoteroConnection(user.id, {
    token: back.searchParams.get("oauth_token") ?? "",
    verifier: back.searchParams.get("oauth_verifier") ?? undefined,
  });
  if (!returned.includes("zotero=connected")) {
    throw new Error(`Connecting Zotero returned to ${returned}`);
  }
  const key = await readZoteroKey(user.id);
  if (key === undefined) {
    throw new Error("The Zotero connection was not saved");
  }
  return key.apiKey;
}

// The bib HTML of a book's MLA entry, with its title in italics.
function bookBib(author: string, title: string): string {
  return `${author}. <i>${title}</i>. Example Press, 2020.`;
}

// A connected owner's quest with a list imported from a new collection of
// these items, checkable through tag when one is given.
interface ZoteroQuest {
  readonly owner: User;
  readonly account: ZoteroAccount;
  readonly apiKey: string;
  readonly questId: QuestId;
  readonly collectionKey: string;
  readonly listId: ListId;
  readonly itemKeys: readonly string[];
}

async function zoteroQuest(
  owner: User,
  {
    items,
    tag,
    collection = "Reading",
    write = tag !== undefined,
  }: {
    readonly items: readonly Omit<FakeItemSeed, "collections">[];
    readonly tag?: string;
    readonly collection?: string;
    // Whether the owner lets Project Buddy change the library: by default,
    // when the list is checkable.
    readonly write?: boolean;
  },
): Promise<ZoteroQuest> {
  const origin = fakeZoteroOrigin();
  const account = await zoteroAccount();
  const apiKey = await connectZotero(owner, account, write);
  const { id: questId } = await createQuest(
    owner.id,
    QUEST_NAME.parse("Thesis"),
  );
  const collectionKey = await addZoteroCollection(
    origin,
    account.zoteroUserId,
    collection,
  );
  const itemKeys = await Promise.all(
    items.map((item) =>
      addZoteroItem(origin, account.zoteroUserId, {
        ...item,
        collections: [collectionKey],
      }),
    ),
  );
  const imported = await importZoteroCollection(owner.id, questId, {
    collectionKey,
    checkmarkTag: tag,
  });
  const listId = LIST_ID.safeParse(imported).data;
  if (listId === undefined) {
    throw new Error(`Importing the collection answered ${imported}`);
  }
  return { owner, account, apiKey, questId, collectionKey, listId, itemKeys };
}

// The list as the user sees it, which must exist.
async function zoteroListOf(
  user: User,
  { questId, listId }: { readonly questId: QuestId; readonly listId: ListId },
): Promise<ZoteroList> {
  const zotero = await readZoteroList(user.id, questId, listId);
  if (zotero === undefined) {
    throw new Error("The Zotero Collection list is not open to the user");
  }
  return zotero;
}

export type { ZoteroAccount, ZoteroQuest };
export {
  bookBib,
  connectZotero,
  fakeZoteroOrigin,
  zoteroAccount,
  zoteroListOf,
  zoteroQuest,
};
