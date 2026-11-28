// Connecting a user's Zotero account through OAuth 1.0a, and what setup
// shows of it. The temporary token, its secret and the API key Zotero
// issues stay on the server: the browser only visits Zotero's page that
// asks the user to approve access, and Zotero sends it back to
// /api/zotero/callback with the temporary token.

import { readZoteroClientIfSet } from "@/env.ts";
import type { UserId } from "@/ids.ts";
import { localPath } from "@/routes.ts";
import {
  deleteKey,
  finishAuthorization,
  readAccess,
  readCollections,
  startAuthorization,
  type ZoteroCollection,
  ZoteroProblem,
} from "./zotero-api.ts";
import {
  endZoteroConnection,
  readZoteroKey,
  saveZoteroAuthorization,
  saveZoteroConnection,
  takeZoteroAuthorization,
  type ZoteroConnection,
} from "./zotero-connection-store.ts";

// The path Zotero sends the user back to.
const CALLBACK_PATH = "/api/zotero/callback";
// Where the callback sends a user it cannot send back to where they were.
const FALLBACK_RETURN = "/quests";

const COLLATOR = new Intl.Collator("en", {
  sensitivity: "base",
  numeric: true,
});

// A collection with its subcollections, by name.
interface CollectionNode {
  readonly key: string;
  readonly name: string;
  readonly children: readonly CollectionNode[];
}

// What Zotero setup shows: the connection, if any, and its collections,
// unless Zotero couldn't list them now.
type ZoteroSetup =
  | { readonly kind: "not-configured" }
  | { readonly kind: "not-connected" }
  | {
      readonly kind: "connected";
      readonly connection: ZoteroConnection;
      readonly collections: readonly CollectionNode[] | undefined;
    };

// A page and its section query, as setup and list pages give it: a local
// path, then optionally "?section=" and a section's name or id.
function returnPathOf(value: string): string {
  const [path = "", query] = value.split("?", 2);
  const local = localPath(path);
  if (local === undefined) {
    return FALLBACK_RETURN;
  }
  const section = new URLSearchParams(query).get("section");
  if (section === null || localPath(`/${section}`) === undefined) {
    return local;
  }
  return `${local}?section=${section}`;
}

// Starts connecting the user's Zotero account, asking for permission to
// change their library when write is true: the Zotero page to send them
// to, or why that can't happen now.
async function beginZoteroConnection(
  owner: UserId,
  {
    origin,
    returnTo,
    write,
  }: {
    readonly origin: string;
    readonly returnTo: string;
    readonly write: boolean;
  },
): Promise<
  | { readonly kind: "authorize"; readonly url: string }
  | { readonly kind: "not-configured" | "zotero-unavailable" }
> {
  if (readZoteroClientIfSet() === undefined) {
    return { kind: "not-configured" };
  }
  try {
    const { token, secret, authorizeUrl } = await startAuthorization({
      callback: `${origin}${CALLBACK_PATH}`,
      write,
    });
    await saveZoteroAuthorization(owner, {
      token,
      secret,
      returnTo: returnPathOf(returnTo),
    });
    return { kind: "authorize", url: authorizeUrl };
  } catch (error) {
    if (error instanceof ZoteroProblem) {
      return { kind: "zotero-unavailable" };
    }
    throw error;
  }
}

function withOutcome(returnTo: string, outcome: string): string {
  const url = new URL(returnTo, "http://return.invalid");
  url.searchParams.set("zotero", outcome);
  return `${url.pathname}${url.search}`;
}

// Finishes connecting once Zotero sent the user back with the temporary
// token: saves the account and its key in place of any earlier one, which
// it revokes. The page to send the user back to, telling it whether the
// connection was made.
async function finishZoteroConnection(
  owner: UserId,
  {
    token,
    verifier,
  }: { readonly token: string; readonly verifier: string | undefined },
): Promise<string> {
  const request = await takeZoteroAuthorization(owner, token);
  if (request === undefined) {
    return withOutcome(FALLBACK_RETURN, "failed");
  }
  try {
    const apiKey = await finishAuthorization({
      token,
      secret: request.secret,
      verifier,
    });
    const access = await readAccess(apiKey);
    const earlier = await saveZoteroConnection(owner, apiKey, access);
    if (earlier !== undefined) {
      await deleteKey(earlier);
    }
    return withOutcome(request.returnTo, "connected");
  } catch (error) {
    if (error instanceof ZoteroProblem) {
      return withOutcome(request.returnTo, "failed");
    }
    throw error;
  }
}

// Ends the user's Zotero connection and revokes its key. Their Zotero
// Collection lists stay, unavailable until they connect again.
async function disconnectZotero(owner: UserId): Promise<void> {
  const key = await readZoteroKey(owner);
  if (key === undefined) {
    return;
  }
  await endZoteroConnection(owner, key.apiKey);
  await deleteKey(key.apiKey);
}

function treeOf(
  collections: readonly ZoteroCollection[],
  parent: string | undefined,
): CollectionNode[] {
  return collections
    .filter((collection) => collection.parent === parent)
    .sort(
      (a, b) => COLLATOR.compare(a.name, b.name) || a.key.localeCompare(b.key),
    )
    .map(({ key, name }) => ({
      key,
      name,
      children: treeOf(collections, key),
    }));
}

// The collections of a library, each under its parent. A collection whose
// parent isn't in the library shows at the top.
function collectionTree(
  collections: readonly ZoteroCollection[],
): CollectionNode[] {
  const keys = new Set(collections.map(({ key }) => key));
  const rooted = collections.map((collection) => {
    if (collection.parent !== undefined && !keys.has(collection.parent)) {
      return { ...collection, parent: undefined };
    }
    return collection;
  });
  return treeOf(rooted, undefined);
}

// What Zotero setup shows the user. A key Zotero no longer accepts ends
// the connection.
async function readZoteroSetup(owner: UserId): Promise<ZoteroSetup> {
  const key = await readZoteroKey(owner);
  if (key === undefined) {
    if (readZoteroClientIfSet() === undefined) {
      return { kind: "not-configured" };
    }
    return { kind: "not-connected" };
  }
  const connection: ZoteroConnection = {
    username: key.username,
    writeAccess: key.writeAccess,
  };
  try {
    const collections = collectionTree(await readCollections(key));
    return { kind: "connected", connection, collections };
  } catch (error) {
    if (!(error instanceof ZoteroProblem)) {
      throw error;
    }
    if (error.kind === "access-ended") {
      await endZoteroConnection(owner, key.apiKey);
      return { kind: "not-connected" };
    }
    return { kind: "connected", connection, collections: undefined };
  }
}

export type { CollectionNode, ZoteroSetup };
export {
  beginZoteroConnection,
  collectionTree,
  disconnectZotero,
  finishZoteroConnection,
  readZoteroSetup,
};
