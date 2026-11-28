// What the fake Zotero (fake-zotero.ts) holds, in memory, and the control
// requests under /_fake/ through which tests set it up and steer it
// (fake-zotero-kit.ts).
import { randomBytes } from "node:crypto";
import { z } from "zod";

const KEY_BYTES = 4;
const TOKEN_BYTES = 12;
const FIRST_USER_ID = 100_000;
const SERVICE_UNAVAILABLE = 503;

interface FakeTag {
  tag: string;
  type?: number | undefined;
}

interface FakeItem {
  key: string;
  version: number;
  itemType: string;
  bib: string;
  // A field a tag write must leave alone.
  title: string;
  tags: FakeTag[];
  collections: string[];
}

interface FakeCollection {
  key: string;
  name: string;
  parent: string | undefined;
}

interface FakeUser {
  id: string;
  username: string;
  collections: Map<string, FakeCollection>;
  items: Map<string, FakeItem>;
  // An edit someone makes in Zotero just before each of the item's next
  // times tag writes, so each meets a newer version.
  interference: Map<string, { tags: FakeTag[]; times: number }>;
  // Once this many more tag writes succeed, every library request for the
  // user fails with failStatus.
  writesBeforeFailure: number | undefined;
  failStatus: number;
  // Requests for the user's collection items wait for a release.
  hold: boolean;
  patches: { itemKey: string; tags: string[] }[];
}

interface FakeKey {
  userId: string;
  write: boolean;
  revoked: boolean;
}

interface RequestToken {
  secret: string;
  callback: string;
  write: boolean;
  approved: { userId: string; verifier: string } | undefined;
}

interface FakeState {
  users: Map<string, FakeUser>;
  keys: Map<string, FakeKey>;
  tokens: Map<string, RequestToken>;
  // What releases each held collection item request, by user.
  held: Map<string, (() => void)[]>;
  // Who waits for a request to be held, by user.
  holdWaiters: Map<string, (() => void)[]>;
}

function fakeState(): FakeState {
  return {
    users: new Map(),
    keys: new Map(),
    tokens: new Map(),
    held: new Map(),
    holdWaiters: new Map(),
  };
}

// An object key as Zotero makes them: eight capitals and digits.
function newKey(): string {
  return randomBytes(KEY_BYTES).toString("hex").toUpperCase();
}

function newToken(): string {
  return randomBytes(TOKEN_BYTES).toString("hex");
}

function userOf(state: FakeState, userId: string): FakeUser {
  const user = state.users.get(userId);
  if (user === undefined) {
    throw new Error(`No fake Zotero user ${userId}`);
  }
  return user;
}

function itemOf(user: FakeUser, itemKey: string): FakeItem {
  const item = user.items.get(itemKey);
  if (item === undefined) {
    throw new Error(`No fake Zotero item ${itemKey}`);
  }
  return item;
}

function wake(waiters: Map<string, (() => void)[]>, userId: string): void {
  for (const resolve of waiters.get(userId) ?? []) {
    resolve();
  }
  waiters.delete(userId);
}

const CONTROL_PATH = /^\/_fake\//u;

const TAG = z.object({ tag: z.string(), type: z.number().optional() });
const USER_ONLY = z.object({ userId: z.string() });
const API_KEY = z.object({ apiKey: z.string() });
const ITEM_KEY = z.object({ userId: z.string(), itemKey: z.string() });

const CONTROLS: Readonly<
  Record<string, (state: FakeState, body: unknown) => unknown>
> = {
  users(state: FakeState, body: unknown): unknown {
    const { username } = z.object({ username: z.string() }).parse(body);
    const id = String(FIRST_USER_ID + state.users.size);
    state.users.set(id, {
      id,
      username,
      collections: new Map(),
      items: new Map(),
      interference: new Map(),
      writesBeforeFailure: undefined,
      failStatus: SERVICE_UNAVAILABLE,
      hold: false,
      patches: [],
    });
    return { userId: id };
  },
  collections(state: FakeState, body: unknown): unknown {
    const { userId, name, parent } = z
      .object({
        userId: z.string(),
        name: z.string(),
        parent: z.string().optional(),
      })
      .parse(body);
    const key = newKey();
    userOf(state, userId).collections.set(key, { key, name, parent });
    return { key };
  },
  collection(state: FakeState, body: unknown): unknown {
    const { userId, collectionKey, name, remove } = z
      .object({
        userId: z.string(),
        collectionKey: z.string(),
        name: z.string().optional(),
        remove: z.boolean().default(false),
      })
      .parse(body);
    const { collections } = userOf(state, userId);
    const collection = collections.get(collectionKey);
    if (remove) {
      collections.delete(collectionKey);
    } else if (collection !== undefined && name !== undefined) {
      collection.name = name;
    }
    return {};
  },
  items(state: FakeState, body: unknown): unknown {
    const seed = z
      .object({
        userId: z.string(),
        collections: z.array(z.string()),
        bib: z.string(),
        title: z.string().default("A work"),
        itemType: z.string().default("book"),
        tags: z.array(TAG).default([]),
      })
      .parse(body);
    const key = newKey();
    userOf(state, seed.userId).items.set(key, {
      key,
      version: 1,
      itemType: seed.itemType,
      bib: seed.bib,
      title: seed.title,
      tags: seed.tags,
      collections: seed.collections,
    });
    return { key };
  },
  item(state: FakeState, body: unknown): unknown {
    const edit = z
      .object({
        userId: z.string(),
        itemKey: z.string(),
        bib: z.string().optional(),
        tags: z.array(TAG).optional(),
        collections: z.array(z.string()).optional(),
      })
      .parse(body);
    const item = itemOf(userOf(state, edit.userId), edit.itemKey);
    item.bib = edit.bib ?? item.bib;
    item.tags = edit.tags ?? item.tags;
    item.collections = edit.collections ?? item.collections;
    item.version += 1;
    return {};
  },
  "read-item"(state: FakeState, body: unknown): unknown {
    const { userId, itemKey } = ITEM_KEY.parse(body);
    return userOf(state, userId).items.get(itemKey) ?? null;
  },
  patches(state: FakeState, body: unknown): unknown {
    return userOf(state, USER_ONLY.parse(body).userId).patches;
  },
  interfere(state: FakeState, body: unknown): unknown {
    const { userId, itemKey, tags, times } = z
      .object({
        userId: z.string(),
        itemKey: z.string(),
        tags: z.array(TAG),
        times: z.number().int().default(1),
      })
      .parse(body);
    userOf(state, userId).interference.set(itemKey, { tags, times });
    return {};
  },
  fail(state: FakeState, body: unknown): unknown {
    const { userId, afterWrites, status } = z
      .object({
        userId: z.string(),
        afterWrites: z.number().int(),
        status: z.number().int().default(SERVICE_UNAVAILABLE),
      })
      .parse(body);
    const user = userOf(state, userId);
    user.writesBeforeFailure = afterWrites;
    user.failStatus = status;
    return {};
  },
  recover(state: FakeState, body: unknown): unknown {
    userOf(state, USER_ONLY.parse(body).userId).writesBeforeFailure = undefined;
    return {};
  },
  hold(state: FakeState, body: unknown): unknown {
    userOf(state, USER_ONLY.parse(body).userId).hold = true;
    return {};
  },
  // Answers once a collection item request for the user is held.
  async held(state: FakeState, body: unknown): Promise<unknown> {
    const { userId } = USER_ONLY.parse(body);
    if ((state.held.get(userId) ?? []).length === 0) {
      await new Promise<void>((resolve) => {
        state.holdWaiters.set(userId, [
          ...(state.holdWaiters.get(userId) ?? []),
          resolve,
        ]);
      });
    }
    return {};
  },
  release(state: FakeState, body: unknown): unknown {
    const { userId } = USER_ONLY.parse(body);
    userOf(state, userId).hold = false;
    wake(state.held, userId);
    return {};
  },
  revoke(state: FakeState, body: unknown): unknown {
    const key = state.keys.get(API_KEY.parse(body).apiKey);
    if (key !== undefined) {
      key.revoked = true;
    }
    return {};
  },
  key(state: FakeState, body: unknown): unknown {
    return state.keys.get(API_KEY.parse(body).apiKey) ?? null;
  },
};

// The answer to the control request at path, under /_fake/.
function control(state: FakeState, path: string, body: unknown): unknown {
  const run = CONTROLS[path.replace(CONTROL_PATH, "")];
  if (run === undefined) {
    throw new Error(`No fake Zotero control ${path}`);
  }
  return run(state, body);
}

export type { FakeCollection, FakeItem, FakeKey, FakeState, FakeTag, FakeUser };
export { control, fakeState, newToken, userOf, wake };
