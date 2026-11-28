// A fake of zotero.org and api.zotero.org for the tests: one long-lived
// HTTP server per test run that answers the OAuth 1.0a flow and the Web
// API v3 calls Project Buddy makes (src/zotero/zotero-api.ts), the way
// Zotero documents them. It checks each OAuth signature with its own
// HMAC-SHA1, so a signing mistake fails the flow here as it would at
// Zotero.
//
// Tests set up and steer it through /_fake/ (fake-zotero-kit.ts). Each test
// makes its own Zotero users, so tests running at once never share data.
import { createHmac } from "node:crypto";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { z } from "zod";
import { FAKE_CLIENT } from "./fake-zotero-client.ts";
import {
  control,
  type FakeCollection,
  type FakeItem,
  type FakeKey,
  type FakeState,
  type FakeUser,
  fakeState,
  newKey,
  newToken,
  noteItem,
  userOf,
  wake,
} from "./fake-zotero-state.ts";

const OK = 200;
const NO_CONTENT = 204;
const FOUND = 302;
const BAD_REQUEST = 400;
const UNAUTHORIZED = 401;
const FORBIDDEN = 403;
const NOT_FOUND = 404;
const PRECONDITION_FAILED = 412;
const SERVER_ERROR = 500;

const PATCH_BODY = z.object({
  tags: z.array(z.object({ tag: z.string(), type: z.number().optional() })),
});
const NOTE_PATCH_BODY = z.object({ note: z.string() });
const NEW_NOTES_BODY = z.array(
  z.object({
    itemType: z.literal("note"),
    parentItem: z.string(),
    note: z.string(),
  }),
);

const HEX = 16;
const DEFAULT_PAGE = 25;
const MAX_PAGE = 100;

// One request and what the fake answers it with.
interface Exchange {
  readonly state: FakeState;
  readonly origin: string;
  readonly request: IncomingMessage;
  readonly response: ServerResponse;
  readonly url: URL;
}

function percent(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/gu,
    (mark) => `%${mark.charCodeAt(0).toString(HEX).toUpperCase()}`,
  );
}

const AUTH_FIELD = /(?<name>[\w.~%-]+)="(?<value>[^"]*)"/gu;

// The OAuth parameters of an Authorization header.
function oauthParams(header: string | undefined): Map<string, string> {
  const params = new Map<string, string>();
  if (header?.startsWith("OAuth ") !== true) {
    return params;
  }
  for (const match of header.matchAll(AUTH_FIELD)) {
    const { name = "", value = "" } = match.groups ?? {};
    params.set(decodeURIComponent(name), decodeURIComponent(value));
  }
  return params;
}

// RFC 5849's order for encoded parameters: by name, then value, by code.
function byteOrder(first: string, second: string): -1 | 0 | 1 {
  if (first < second) {
    return -1;
  }
  if (first > second) {
    return 1;
  }
  return 0;
}

// Whether the request carries a valid HMAC-SHA1 signature from the client
// with the token secret, computed as RFC 5849 section 3.4 says.
function signedRight(
  endpoint: string,
  params: ReadonlyMap<string, string>,
  tokenSecret: string,
): boolean {
  if (
    params.get("oauth_consumer_key") !== FAKE_CLIENT.key ||
    params.get("oauth_signature_method") !== "HMAC-SHA1" ||
    !params.has("oauth_nonce") ||
    !params.has("oauth_timestamp")
  ) {
    return false;
  }
  const normalized = [...params]
    .filter(([name]) => name !== "oauth_signature")
    .map(([name, value]) => `${percent(name)}=${percent(value)}`)
    .sort(byteOrder)
    .join("&");
  const base = ["POST", percent(endpoint), percent(normalized)].join("&");
  const expected = createHmac(
    "sha1",
    `${percent(FAKE_CLIENT.secret)}&${percent(tokenSecret)}`,
  )
    .update(base)
    .digest("base64");
  return expected === params.get("oauth_signature");
}

async function bodyOf(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function sendText(
  response: ServerResponse,
  status: number,
  text: string,
): void {
  response.writeHead(status, { "content-type": "text/plain" }).end(text);
}

function sendJson(
  response: ServerResponse,
  body: unknown,
  headers: Readonly<Record<string, string>> = {},
): void {
  response
    .writeHead(OK, { "content-type": "application/json", ...headers })
    .end(JSON.stringify(body));
}

function sendForm(
  response: ServerResponse,
  fields: readonly (readonly [string, string])[],
): void {
  response
    .writeHead(OK, { "content-type": "application/x-www-form-urlencoded" })
    .end(
      new URLSearchParams(
        fields.map(([name, value]) => [name, value]),
      ).toString(),
    );
}

function itemJson(origin: string, user: FakeUser, item: FakeItem): unknown {
  return {
    key: item.key,
    version: item.version,
    library: { type: "user", id: Number(user.id) },
    links: {
      alternate: {
        href: `${origin}/${user.username}/items/${item.key}`,
        type: "text/html",
      },
    },
    bib: `<div class="csl-bib-body"><div class="csl-entry">${item.bib}</div></div>`,
    data: dataOf(item),
  };
}

// An item's data as Zotero gives it: a note's parent and HTML, or a
// bibliographic item's fields.
function dataOf(item: FakeItem): unknown {
  if (item.parentItem !== undefined) {
    return {
      key: item.key,
      version: item.version,
      itemType: item.itemType,
      parentItem: item.parentItem,
      note: item.note,
      tags: item.tags,
      collections: [],
    };
  }
  return {
    key: item.key,
    version: item.version,
    itemType: item.itemType,
    title: item.title,
    tags: item.tags,
    collections: item.collections,
  };
}

// The items directly in the collection, without their child notes.
function topItems(user: FakeUser, collectionKey: string): FakeItem[] {
  return [...user.items.values()].filter(({ collections }) =>
    collections.includes(collectionKey),
  );
}

function collectionJson(user: FakeUser, collection: FakeCollection): unknown {
  let parentCollection: string | false = false;
  if (collection.parent !== undefined) {
    parentCollection = collection.parent;
  }
  return {
    key: collection.key,
    version: 1,
    meta: { numItems: topItems(user, collection.key).length },
    data: { key: collection.key, name: collection.name, parentCollection },
  };
}

function sendPage(
  { response, url }: Exchange,
  objects: readonly unknown[],
): void {
  const limit = Math.min(
    Number(url.searchParams.get("limit") ?? DEFAULT_PAGE),
    MAX_PAGE,
  );
  const start = Number(url.searchParams.get("start") ?? 0);
  sendJson(response, objects.slice(start, start + limit), {
    "Total-Results": String(objects.length),
  });
}

function approvalPage(token: string, write: boolean): string {
  let asks = "read your library";
  if (write) {
    asks = "read and change your library";
  }
  return `<!doctype html>
<html lang="en"><head><title>Fake Zotero: approve access</title></head>
<body>
<h1>Fake Zotero</h1>
<p>Project Buddy asks to ${asks}.</p>
<form method="post" action="/oauth/authorize">
<input type="hidden" name="oauth_token" value="${token}">
<label>Username <input name="username"></label>
<button type="submit" name="decision" value="accept">Accept</button>
<button type="submit" name="decision" value="deny">Deny</button>
</form>
</body></html>`;
}

// POST /oauth/request: a temporary token for the client.
function requestToken({
  state,
  origin,
  request,
  response,
  url,
}: Exchange): void {
  const params = oauthParams(request.headers.authorization);
  const callback = params.get("oauth_callback");
  if (
    callback === undefined ||
    !signedRight(`${origin}${url.pathname}`, params, "")
  ) {
    sendText(response, UNAUTHORIZED, "Invalid signature");
    return;
  }
  const token = newToken();
  const secret = newToken();
  state.tokens.set(token, {
    secret,
    callback,
    write: false,
    approved: undefined,
  });
  sendForm(response, [
    ["oauth_token", token],
    ["oauth_token_secret", secret],
    ["oauth_callback_confirmed", "true"],
  ]);
}

// GET /oauth/authorize: the page where the user accepts or denies.
function authorizePage({ state, response, url }: Exchange): void {
  const token = url.searchParams.get("oauth_token") ?? "";
  const pending = state.tokens.get(token);
  if (pending === undefined) {
    sendText(response, BAD_REQUEST, "Unknown token");
    return;
  }
  pending.write = url.searchParams.get("write_access") === "1";
  response
    .writeHead(OK, { "content-type": "text/html; charset=utf-8" })
    .end(approvalPage(token, pending.write));
}

// POST /oauth/authorize: the user's answer, sent back to the callback with
// a verifier when they accepted.
async function authorizeAnswer({
  state,
  request,
  response,
}: Exchange): Promise<void> {
  const form = new URLSearchParams(await bodyOf(request));
  const token = form.get("oauth_token") ?? "";
  const pending = state.tokens.get(token);
  if (pending === undefined) {
    sendText(response, BAD_REQUEST, "Unknown token");
    return;
  }
  const back = new URL(pending.callback);
  back.searchParams.set("oauth_token", token);
  const user = [...state.users.values()].find(
    ({ username }) => username === form.get("username"),
  );
  if (form.get("decision") === "accept" && user !== undefined) {
    pending.approved = { userId: user.id, verifier: newToken() };
    back.searchParams.set("oauth_verifier", pending.approved.verifier);
  }
  response.writeHead(FOUND, { location: back.toString() }).end();
}

// POST /oauth/access: the API key for an approved token, which Zotero
// gives as the token secret.
function accessToken({
  state,
  origin,
  request,
  response,
  url,
}: Exchange): void {
  const params = oauthParams(request.headers.authorization);
  const token = params.get("oauth_token") ?? "";
  const pending = state.tokens.get(token);
  if (
    pending?.approved === undefined ||
    params.get("oauth_verifier") !== pending.approved.verifier ||
    !signedRight(`${origin}${url.pathname}`, params, pending.secret)
  ) {
    sendText(response, UNAUTHORIZED, "Invalid request");
    return;
  }
  state.tokens.delete(token);
  const apiKey = newToken();
  const { userId } = pending.approved;
  state.keys.set(apiKey, { userId, write: pending.write, revoked: false });
  sendForm(response, [
    ["oauth_token", apiKey],
    ["oauth_token_secret", apiKey],
    ["userID", userId],
    ["username", userOf(state, userId).username],
  ]);
}

// The OAuth endpoints on zotero.org.
async function oauth(exchange: Exchange): Promise<void> {
  const { request, response, url } = exchange;
  const route = `${request.method ?? ""} ${url.pathname}`;
  if (route === "POST /oauth/request") {
    requestToken(exchange);
    return;
  }
  if (route === "GET /oauth/authorize") {
    authorizePage(exchange);
    return;
  }
  if (route === "POST /oauth/authorize") {
    await authorizeAnswer(exchange);
    return;
  }
  if (route === "POST /oauth/access") {
    accessToken(exchange);
    return;
  }
  sendText(response, NOT_FOUND, "Not found");
}

function liveKey({
  state,
  request,
}: Exchange): { readonly apiKey: string; readonly key: FakeKey } | undefined {
  const apiKey = request.headers["zotero-api-key"];
  if (
    typeof apiKey !== "string" ||
    request.headers["zotero-api-version"] !== "3"
  ) {
    return undefined;
  }
  const key = state.keys.get(apiKey);
  if (key === undefined || key.revoked) {
    return undefined;
  }
  return { apiKey, key };
}

// A tag write: 412 when the item changed since the version the client
// read, else the item gets exactly the tags sent.
async function patchItem(
  { request, response }: Exchange,
  { user, key }: { readonly user: FakeUser; readonly key: FakeKey },
  item: FakeItem,
): Promise<void> {
  if (!key.write) {
    sendText(response, FORBIDDEN, "Write access denied");
    return;
  }
  const interference = user.interference.get(item.key);
  if (interference !== undefined) {
    item.tags = interference.tags;
    item.version += 1;
    interference.times -= 1;
    if (interference.times <= 0) {
      user.interference.delete(item.key);
    }
  }
  if (request.headers["if-unmodified-since-version"] !== String(item.version)) {
    sendText(response, PRECONDITION_FAILED, "Item changed");
    return;
  }
  const sent: unknown = JSON.parse(await bodyOf(request));
  const { tags } = PATCH_BODY.parse(sent);
  item.tags = tags;
  item.version += 1;
  user.patches.push({ itemKey: item.key, tags: tags.map(({ tag }) => tag) });
  countWrite(user);
  response
    .writeHead(NO_CONTENT, { "Last-Modified-Version": String(item.version) })
    .end();
}

function countWrite(user: FakeUser): void {
  if (user.writesBeforeFailure !== undefined) {
    user.writesBeforeFailure -= 1;
  }
}

// A note write: 412 when the note changed since the version the client
// read, else the note gets the HTML sent.
async function patchNote(
  { request, response }: Exchange,
  { user, key }: { readonly user: FakeUser; readonly key: FakeKey },
  item: FakeItem,
): Promise<void> {
  if (!key.write) {
    sendText(response, FORBIDDEN, "Write access denied");
    return;
  }
  const interference = user.noteInterference.get(item.key);
  if (interference !== undefined) {
    item.note = interference.note;
    item.version += 1;
    interference.times -= 1;
    if (interference.times <= 0) {
      user.noteInterference.delete(item.key);
    }
  }
  if (request.headers["if-unmodified-since-version"] !== String(item.version)) {
    sendText(response, PRECONDITION_FAILED, "Item changed");
    return;
  }
  const sent: unknown = JSON.parse(await bodyOf(request));
  item.note = NOTE_PATCH_BODY.parse(sent).note;
  item.version += 1;
  user.noteWrites.push({
    noteKey: item.key,
    parentItem: item.parentItem ?? "",
    note: item.note,
  });
  countWrite(user);
  response
    .writeHead(NO_CONTENT, { "Last-Modified-Version": String(item.version) })
    .end();
}

// POST /users/USER_ID/items: new child notes, as Zotero answers a write of
// new objects.
async function createNotes(
  { request, response }: Exchange,
  { user, key }: { readonly user: FakeUser; readonly key: FakeKey },
): Promise<void> {
  if (!key.write) {
    sendText(response, FORBIDDEN, "Write access denied");
    return;
  }
  const sent: unknown = JSON.parse(await bodyOf(request));
  const notes = NEW_NOTES_BODY.parse(sent);
  const successful: Record<string, unknown> = {};
  const failed: Record<string, unknown> = {};
  for (const [index, { parentItem, note }] of notes.entries()) {
    if (user.items.has(parentItem)) {
      successful[String(index)] = addNote(user, parentItem, note);
    } else {
      failed[String(index)] = { code: BAD_REQUEST, message: "No parent" };
    }
  }
  countWrite(user);
  sendJson(response, { successful, success: {}, unchanged: {}, failed });
}

// Adds the note to the user's library: what Zotero answers for it.
function addNote(user: FakeUser, parentItem: string, note: string): unknown {
  const noteKey = newKey();
  const item = noteItem(noteKey, parentItem, note);
  user.items.set(noteKey, item);
  user.noteWrites.push({ noteKey, parentItem, note });
  return { key: noteKey, version: item.version, data: dataOf(item) };
}

// The items in the collection and their child notes, of the itemType the
// request asks for when it asks.
function collectionItems(
  { url }: Exchange,
  user: FakeUser,
  collectionKey: string,
): FakeItem[] {
  const top = topItems(user, collectionKey);
  const parents = new Set(top.map(({ key }) => key));
  const children = [...user.items.values()].filter(
    ({ parentItem }) => parentItem !== undefined && parents.has(parentItem),
  );
  const itemType = url.searchParams.get("itemType");
  return [...top, ...children].filter(
    (item) => itemType === null || item.itemType === itemType,
  );
}

// Requests for the user's collection items wait here while they are held.
async function heldItems(state: FakeState, user: FakeUser): Promise<void> {
  if (!user.hold) {
    return;
  }
  await new Promise<void>((resolve) => {
    state.held.set(user.id, [...(state.held.get(user.id) ?? []), resolve]);
    wake(state.holdWaiters, user.id);
  });
}

// The requests under /users/USER_ID on api.zotero.org, for the key's own
// library.
async function library(
  exchange: Exchange,
  access: { readonly user: FakeUser; readonly key: FakeKey },
  parts: readonly string[],
): Promise<void> {
  const { state, origin, request, response } = exchange;
  const { user } = access;
  const [kind = "", objectKey = "", sub = "", top = ""] = parts;
  if (kind === "collections" && parts.length === 1) {
    sendPage(
      exchange,
      [...user.collections.values()].map((each) => collectionJson(user, each)),
    );
    return;
  }
  if (kind === "items" && parts.length === 1 && request.method === "POST") {
    await createNotes(exchange, access);
    return;
  }
  const collection = user.collections.get(objectKey);
  if (kind === "collections" && collection === undefined) {
    sendText(response, NOT_FOUND, "Not found");
    return;
  }
  if (
    kind === "collections" &&
    collection !== undefined &&
    parts.length === 2
  ) {
    sendJson(response, collectionJson(user, collection));
    return;
  }
  if (kind === "collections" && sub === "items" && top === "top") {
    await heldItems(state, user);
    sendPage(
      exchange,
      topItems(user, objectKey).map((each) => itemJson(origin, user, each)),
    );
    return;
  }
  if (kind === "collections" && sub === "items" && top === "") {
    sendPage(
      exchange,
      collectionItems(exchange, user, objectKey).map((each) =>
        itemJson(origin, user, each),
      ),
    );
    return;
  }
  const item = user.items.get(objectKey);
  if (kind !== "items" || parts.length !== 2 || item === undefined) {
    sendText(response, NOT_FOUND, "Not found");
    return;
  }
  if (request.method === "PATCH" && item.parentItem !== undefined) {
    await patchNote(exchange, access, item);
    return;
  }
  if (request.method === "PATCH") {
    await patchItem(exchange, access, item);
    return;
  }
  sendJson(response, itemJson(origin, user, item));
}

const USER_PATH = /^\/users\/(?<userId>\d+)(?<rest>\/.*)$/u;

// The Web API endpoints on api.zotero.org.
async function api(exchange: Exchange): Promise<void> {
  const { state, request, response, url } = exchange;
  const live = liveKey(exchange);
  if (live === undefined) {
    sendText(response, FORBIDDEN, "Forbidden");
    return;
  }
  const { apiKey, key } = live;
  if (url.pathname === "/keys/current" && request.method === "DELETE") {
    key.revoked = true;
    response.writeHead(NO_CONTENT).end();
    return;
  }
  if (url.pathname === "/keys/current") {
    // Zotero spells the field userID.
    sendJson(response, {
      ...Object.fromEntries([["userID", Number(key.userId)]]),
      key: apiKey,
      username: userOf(state, key.userId).username,
      access: {
        user: { library: true, files: false, notes: true, write: key.write },
      },
    });
    return;
  }
  const { userId = "", rest = "" } = USER_PATH.exec(url.pathname)?.groups ?? {};
  if (userId !== key.userId) {
    sendText(response, FORBIDDEN, "Forbidden");
    return;
  }
  const user = userOf(state, userId);
  if (user.writesBeforeFailure !== undefined && user.writesBeforeFailure <= 0) {
    sendText(response, user.failStatus, "Service unavailable");
    return;
  }
  await library(
    exchange,
    { user, key },
    rest.split("/").filter((part) => part !== ""),
  );
}

async function controlRequest({
  state,
  request,
  response,
  url,
}: Exchange): Promise<void> {
  const text = await bodyOf(request);
  let body: unknown = {};
  if (text !== "") {
    body = JSON.parse(text);
  }
  sendJson(response, (await control(state, url.pathname, body)) ?? null);
}

function answer(exchange: Exchange): Promise<void> {
  const { pathname } = exchange.url;
  if (pathname.startsWith("/_fake/")) {
    return controlRequest(exchange);
  }
  if (pathname.startsWith("/oauth/")) {
    return oauth(exchange);
  }
  return api(exchange);
}

// Starts the fake on a free local port. Its origin serves both zotero.org's
// OAuth pages and api.zotero.org's Web API.
async function startFakeZotero(): Promise<{
  readonly origin: string;
  readonly server: Server;
}> {
  const state = fakeState();
  let origin = "";
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", origin);
    answer({ state, origin, request, response, url }).catch(
      (error: unknown) => {
        if (!response.headersSent) {
          sendText(response, SERVER_ERROR, String(error));
        }
      },
    );
  });
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("The fake Zotero server has no port");
  }
  origin = `http://127.0.0.1:${address.port}`;
  return { origin, server };
}

export { startFakeZotero };
