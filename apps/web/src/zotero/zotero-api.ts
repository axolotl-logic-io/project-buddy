// Zotero, as Project Buddy reaches it: the OAuth 1.0a flow that connects an
// account (https://www.zotero.org/support/dev/web_api/v3/oauth) and the Web
// API v3 calls that read a personal library's collections and references
// and change an item's tags. This module alone knows Zotero's URLs, headers,
// signatures and JSON. A failure is a ZoteroProblem that names what it
// means for the caller; the key and tokens never appear in one.
import { z } from "zod";
import { hmacSha1 } from "@/auth/hmac.ts";
import { readZoteroClientIfSet, readZoteroOrigins } from "@/env.ts";
import { logZoteroFailure } from "@/errors/error-log.ts";
import { entryFromBib } from "./works-cited.ts";
import type { WorksCitedEntry } from "./zotero.ts";

// How long one Zotero request may take before it counts as Zotero not
// answering. It only fails a request; nothing waits on it.
const REQUEST_DEADLINE_MS = 20_000;
// The most objects Zotero returns in one page.
const PAGE_SIZE = 100;
// The Works Cited style: Zotero's name for MLA's CSL style.
const STYLE = "modern-language-association";
const APP_NAME = "Project Buddy";
// What RFC 3986 reserves beyond encodeURIComponent's escapes.
const UNRESERVED_EXTRA = /[!'()*]/gu;
// How many random bytes make an OAuth nonce.
const NONCE_BYTES = 16;
const HEX = 16;
const MS_PER_SECOND = 1000;
// The HTTP statuses that mean something to a caller.
const STATUS = {
  unauthorized: 401,
  forbidden: 403,
  notFound: 404,
  preconditionFailed: 412,
} as const;
// Item types that hold no bibliographic work of their own.
const NOT_WORKS: ReadonlySet<string> = new Set([
  "attachment",
  "annotation",
  "note",
]);

// What a failed Zotero call means: the key no longer works or lacks a
// permission ("access-ended"), the object is gone ("missing"), the item
// changed since it was read ("changed"), or Zotero didn't answer usefully
// ("unavailable").
type ZoteroProblemKind = "access-ended" | "missing" | "changed" | "unavailable";

class ZoteroProblem extends Error {
  readonly kind: ZoteroProblemKind;

  constructor(
    kind: ZoteroProblemKind,
    {
      operation,
      cause,
    }: { readonly operation: string; readonly cause?: unknown },
  ) {
    super(`Zotero ${kind} in ${operation}`, { cause });
    this.name = "ZoteroProblem";
    this.kind = kind;
  }
}

// A key to one user's personal library.
interface ZoteroKey {
  readonly apiKey: string;
  readonly zoteroUserId: string;
}

interface ZoteroAccess {
  readonly zoteroUserId: string;
  readonly username: string;
  // Whether the key may change the library.
  readonly write: boolean;
}

interface ZoteroCollection {
  readonly key: string;
  readonly name: string;
  // The key of the collection it is in, if any.
  readonly parent: string | undefined;
}

interface ZoteroTag {
  readonly tag: string;
  readonly type?: number | undefined;
}

// A bibliographic item directly in a collection.
interface ZoteroItem {
  readonly key: string;
  readonly version: number;
  readonly entry: WorksCitedEntry;
  // The item's page on zotero.org, if Zotero gave one.
  readonly href: string | undefined;
  readonly tags: readonly ZoteroTag[];
  readonly collections: readonly string[];
}

const TOKEN_RESPONSE = z.object({
  oauthToken: z.string().min(1),
  oauthTokenSecret: z.string().min(1),
});

// Zotero names the user's id userID, which readAccess reads by
// destructuring.
const USER_ID = z.union([z.number().int(), z.string().min(1)]);
const KEY_RESPONSE = z.looseObject({
  username: z.string(),
  access: z
    .object({
      user: z.object({ write: z.boolean().optional() }).optional(),
    })
    .optional(),
});

const COLLECTION_RESPONSE = z.object({
  key: z.string(),
  data: z.object({
    name: z.string(),
    parentCollection: z.union([z.string(), z.literal(false)]).optional(),
  }),
});

const HTTP_LINK = z.url({ protocol: /^https?$/u });

const ITEM_RESPONSE = z.object({
  key: z.string(),
  version: z.number().int(),
  links: z
    .object({
      alternate: z.object({ href: z.string() }).optional(),
    })
    .optional(),
  bib: z.string().optional(),
  data: z.object({
    itemType: z.string(),
    tags: z
      .array(z.object({ tag: z.string(), type: z.number().int().optional() }))
      .default([]),
    collections: z.array(z.string()).default([]),
  }),
});

function percent(value: string): string {
  return encodeURIComponent(value).replace(
    UNRESERVED_EXTRA,
    (mark: string): string =>
      `%${mark.charCodeAt(0).toString(HEX).toUpperCase()}`,
  );
}

function client(operation: string): {
  readonly key: string;
  readonly secret: string;
} {
  const registered = readZoteroClientIfSet();
  if (registered === undefined) {
    throw new ZoteroProblem("unavailable", { operation });
  }
  return registered;
}

function nonce(): string {
  return Array.from(
    crypto.getRandomValues(new Uint8Array(NONCE_BYTES)),
    (byte) => byte.toString(HEX).padStart(2, "0"),
  ).join("");
}

function base64(bytes: ArrayBuffer): string {
  return btoa(String.fromCodePoint(...new Uint8Array(bytes)));
}

// OAuth's order for encoded parameters: by name, then by value, comparing
// their characters' codes, which for encoded text are its bytes.
function byteOrder(
  [firstName, firstValue]: readonly [string, string],
  [secondName, secondValue]: readonly [string, string],
): -1 | 0 | 1 {
  const first = `${firstName}\u0000${firstValue}`;
  const second = `${secondName}\u0000${secondValue}`;
  if (first < second) {
    return -1;
  }
  if (first > second) {
    return 1;
  }
  return 0;
}

// The Authorization header that signs an OAuth 1.0a POST to url with
// HMAC-SHA1, carrying params and the token secret's half of the key.
async function signedHeader(
  url: string,
  params: readonly (readonly [string, string])[],
  tokenSecret: string,
  operation: string,
): Promise<string> {
  const { key, secret } = client(operation);
  const all: (readonly [string, string])[] = [
    ...params,
    ["oauth_consumer_key", key],
    ["oauth_nonce", nonce()],
    ["oauth_signature_method", "HMAC-SHA1"],
    ["oauth_timestamp", String(Math.floor(Date.now() / MS_PER_SECOND))],
    ["oauth_version", "1.0"],
  ];
  const normalized = all
    .map(([name, value]): [string, string] => [percent(name), percent(value)])
    .sort(byteOrder)
    .map(([name, value]) => `${name}=${value}`)
    .join("&");
  const base = ["POST", percent(url), percent(normalized)].join("&");
  const signature = base64(
    await hmacSha1(`${percent(secret)}&${percent(tokenSecret)}`, base),
  );
  const signed: (readonly [string, string])[] = [
    ...all,
    ["oauth_signature", signature],
  ];
  const fields = signed.map(
    ([name, value]) => `${percent(name)}="${percent(value)}"`,
  );
  return `OAuth ${fields.join(", ")}`;
}

// The response, or a ZoteroProblem when the request failed or Zotero
// answered with a status that means one.
async function send(
  operation: string,
  url: string,
  init: RequestInit,
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(REQUEST_DEADLINE_MS),
    });
  } catch (error) {
    logZoteroFailure("unavailable", operation, error);
    throw new ZoteroProblem("unavailable", { operation, cause: error });
  }
  if (response.ok) {
    return response;
  }
  const { status } = response;
  let kind: ZoteroProblemKind = "unavailable";
  if (status === STATUS.forbidden || status === STATUS.unauthorized) {
    kind = "access-ended";
  } else if (status === STATUS.notFound) {
    kind = "missing";
  } else if (status === STATUS.preconditionFailed) {
    kind = "changed";
  }
  const failure = new ZoteroProblem(kind, {
    operation: `${operation}, HTTP ${status}`,
  });
  if (kind === "unavailable") {
    logZoteroFailure(kind, operation, failure);
  }
  throw failure;
}

async function tokenRequest(
  operation: string,
  path: string,
  params: readonly (readonly [string, string])[],
  tokenSecret: string,
): Promise<URLSearchParams> {
  const url = `${readZoteroOrigins().oauth}${path}`;
  const headers = new Headers();
  headers.set(
    "Authorization",
    await signedHeader(url, params, tokenSecret, operation),
  );
  const response = await send(operation, url, { method: "POST", headers });
  return new URLSearchParams(await response.text());
}

function tokensOf(
  operation: string,
  body: URLSearchParams,
): z.infer<typeof TOKEN_RESPONSE> {
  const tokens = TOKEN_RESPONSE.safeParse({
    oauthToken: body.get("oauth_token"),
    oauthTokenSecret: body.get("oauth_token_secret"),
  });
  if (!tokens.success) {
    throw new ZoteroProblem("unavailable", { operation, cause: tokens.error });
  }
  return tokens.data;
}

// Starts connecting an account: a temporary token and its secret, and the
// Zotero page where the user approves access to their personal library,
// with permission to change it when write is true. Zotero sends the user
// back to callback.
async function startAuthorization({
  callback,
  write,
}: {
  readonly callback: string;
  readonly write: boolean;
}): Promise<{
  readonly token: string;
  readonly secret: string;
  readonly authorizeUrl: string;
}> {
  const operation = "startAuthorization";
  const tokens = tokensOf(
    operation,
    await tokenRequest(
      operation,
      "/oauth/request",
      [["oauth_callback", callback]],
      "",
    ),
  );
  const authorize = new URL(`${readZoteroOrigins().oauth}/oauth/authorize`);
  authorize.searchParams.set("oauth_token", tokens.oauthToken);
  authorize.searchParams.set("name", APP_NAME);
  authorize.searchParams.set("library_access", "1");
  authorize.searchParams.set("notes_access", "0");
  authorize.searchParams.set("write_access", String(Number(write)));
  authorize.searchParams.set("all_groups", "none");
  return {
    token: tokens.oauthToken,
    secret: tokens.oauthTokenSecret,
    authorizeUrl: authorize.toString(),
  };
}

// The API key Zotero issues once the user approved the temporary token.
async function finishAuthorization({
  token,
  secret,
  verifier,
}: {
  readonly token: string;
  readonly secret: string;
  readonly verifier: string | undefined;
}): Promise<string> {
  const operation = "finishAuthorization";
  const params: (readonly [string, string])[] = [["oauth_token", token]];
  if (verifier !== undefined) {
    params.push(["oauth_verifier", verifier]);
  }
  const tokens = tokensOf(
    operation,
    await tokenRequest(operation, "/oauth/access", params, secret),
  );
  // Zotero's key is the token secret.
  return tokens.oauthTokenSecret;
}

function apiHeaders(apiKey: string): Headers {
  const headers = new Headers();
  headers.set("Zotero-API-Version", "3");
  headers.set("Zotero-API-Key", apiKey);
  return headers;
}

async function apiJson(
  operation: string,
  apiKey: string,
  path: string,
  query: Readonly<Record<string, string>> = {},
): Promise<{ readonly body: unknown; readonly total: number | undefined }> {
  const url = new URL(`${readZoteroOrigins().api}${path}`);
  for (const [name, value] of Object.entries(query)) {
    url.searchParams.set(name, value);
  }
  const response = await send(operation, url.toString(), {
    headers: apiHeaders(apiKey),
  });
  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    throw new ZoteroProblem("unavailable", { operation, cause: error });
  }
  const total = z.coerce
    .number()
    .int()
    .safeParse(response.headers.get("Total-Results") ?? undefined).data;
  return { body, total };
}

function parsed<T>(operation: string, schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ZoteroProblem("unavailable", { operation, cause: result.error });
  }
  return result.data;
}

// Every page of a multi-object request, in order, after the objects
// already read. Each page waits for the one before it, since Zotero asks
// clients to keep few requests in flight.
async function allPages(
  operation: string,
  apiKey: string,
  {
    path,
    query,
  }: {
    readonly path: string;
    readonly query: Readonly<Record<string, string>>;
  },
  read: readonly unknown[] = [],
): Promise<unknown[]> {
  const { body, total } = await apiJson(operation, apiKey, path, {
    ...query,
    limit: String(PAGE_SIZE),
    start: String(read.length),
  });
  const objects = [...read, ...parsed(operation, z.array(z.unknown()), body)];
  if (
    objects.length === read.length ||
    total === undefined ||
    objects.length >= total
  ) {
    return objects;
  }
  return allPages(operation, apiKey, { path, query }, objects);
}

// Whom the key belongs to and whether it may change their library.
async function readAccess(apiKey: string): Promise<ZoteroAccess> {
  const operation = "readAccess";
  const { body } = await apiJson(operation, apiKey, "/keys/current");
  const key = parsed(operation, KEY_RESPONSE, body);
  const { userID: userId } = key;
  return {
    zoteroUserId: String(parsed(operation, USER_ID, userId)),
    username: key.username,
    write: key.access?.user?.write === true,
  };
}

// Deletes the key at Zotero, as disconnecting does. A key Zotero no longer
// has, or a Zotero that doesn't answer, leaves nothing more to do.
async function deleteKey(apiKey: string): Promise<void> {
  try {
    await send("deleteKey", `${readZoteroOrigins().api}/keys/current`, {
      method: "DELETE",
      headers: apiHeaders(apiKey),
    });
  } catch (error) {
    if (!(error instanceof ZoteroProblem)) {
      throw error;
    }
  }
}

function libraryPath({ zoteroUserId }: ZoteroKey): string {
  return `/users/${encodeURIComponent(zoteroUserId)}`;
}

// Every collection in the personal library, subcollections included.
async function readCollections(key: ZoteroKey): Promise<ZoteroCollection[]> {
  const operation = "readCollections";
  const objects = await allPages(operation, key.apiKey, {
    path: `${libraryPath(key)}/collections`,
    query: {},
  });
  return objects.map((object) => {
    const collection = parsed(operation, COLLECTION_RESPONSE, object);
    let parent: string | undefined;
    if (typeof collection.data.parentCollection === "string") {
      parent = collection.data.parentCollection;
    }
    return { key: collection.key, name: collection.data.name, parent };
  });
}

// The collection's name; missing when it is gone.
async function readCollectionName(
  key: ZoteroKey,
  collectionKey: string,
): Promise<string> {
  const operation = "readCollectionName";
  const { body } = await apiJson(
    operation,
    key.apiKey,
    `${libraryPath(key)}/collections/${encodeURIComponent(collectionKey)}`,
  );
  return parsed(operation, COLLECTION_RESPONSE, body).data.name;
}

function toItem(operation: string, object: unknown): ZoteroItem | undefined {
  const item = parsed(operation, ITEM_RESPONSE, object);
  if (NOT_WORKS.has(item.data.itemType)) {
    return undefined;
  }
  return {
    key: item.key,
    version: item.version,
    entry: entryFromBib(item.bib ?? ""),
    href: HTTP_LINK.safeParse(item.links?.alternate?.href).data,
    tags: item.data.tags,
    collections: item.data.collections,
  };
}

const ITEM_QUERY: Readonly<Record<string, string>> = {
  format: "json",
  include: "bib,data",
  style: STYLE,
};

// The bibliographic items directly in the collection, with their Works
// Cited entries; missing when the collection is gone.
async function readCollectionItems(
  key: ZoteroKey,
  collectionKey: string,
): Promise<ZoteroItem[]> {
  const operation = "readCollectionItems";
  const objects = await allPages(operation, key.apiKey, {
    path: `${libraryPath(key)}/collections/${encodeURIComponent(collectionKey)}/items/top`,
    query: ITEM_QUERY,
  });
  return objects.flatMap((object) => toItem(operation, object) ?? []);
}

// The item as it is now, or undefined when it is gone.
async function readItem(
  key: ZoteroKey,
  itemKey: string,
): Promise<ZoteroItem | undefined> {
  const operation = "readItem";
  try {
    const { body } = await apiJson(
      operation,
      key.apiKey,
      `${libraryPath(key)}/items/${encodeURIComponent(itemKey)}`,
      ITEM_QUERY,
    );
    return toItem(operation, body);
  } catch (error) {
    if (error instanceof ZoteroProblem && error.kind === "missing") {
      return undefined;
    }
    throw error;
  }
}

// Gives the item exactly these tags, leaving its other fields alone, if it
// is still at the version it was read at: "changed" when someone changed
// it since.
async function writeTags(
  key: ZoteroKey,
  item: ZoteroItem,
  tags: readonly ZoteroTag[],
): Promise<"saved" | "changed"> {
  const operation = "writeTags";
  const headers = apiHeaders(key.apiKey);
  headers.set("Content-Type", "application/json");
  headers.set("If-Unmodified-Since-Version", String(item.version));
  try {
    await send(
      operation,
      `${readZoteroOrigins().api}${libraryPath(key)}/items/${encodeURIComponent(item.key)}`,
      { method: "PATCH", headers, body: JSON.stringify({ tags }) },
    );
    return "saved";
  } catch (error) {
    if (error instanceof ZoteroProblem && error.kind === "changed") {
      return "changed";
    }
    throw error;
  }
}

export type {
  ZoteroAccess,
  ZoteroCollection,
  ZoteroItem,
  ZoteroKey,
  ZoteroProblemKind,
  ZoteroTag,
};
export {
  deleteKey,
  finishAuthorization,
  readAccess,
  readCollectionItems,
  readCollectionName,
  readCollections,
  readItem,
  startAuthorization,
  writeTags,
  ZoteroProblem,
};
