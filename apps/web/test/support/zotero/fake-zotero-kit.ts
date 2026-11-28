// Sets up and steers the fake Zotero (fake-zotero.ts) from a test, through
// its /_fake/ control requests. Each helper takes the fake's origin: server
// tests get it from fakeZoteroOrigin() (zotero-test-kit.ts), and system
// tests from ZOTERO_API_ORIGIN, which Playwright copies from the fake's
// web server.

interface FakeTag {
  readonly tag: string;
  readonly type?: number;
}

interface FakeItemSeed {
  readonly collections: readonly string[];
  // The item's MLA entry as Zotero's bib HTML gives it, inside the
  // csl-entry div.
  readonly bib: string;
  readonly title?: string;
  readonly itemType?: string;
  readonly tags?: readonly FakeTag[];
}

interface FakeItemNow {
  readonly key: string;
  readonly version: number;
  readonly bib: string;
  readonly title: string;
  readonly tags: readonly FakeTag[];
  readonly collections: readonly string[];
}

async function control<T>(
  origin: string,
  path: string,
  body: Readonly<Record<string, unknown>>,
): Promise<T> {
  const response = await fetch(`${origin}/_fake/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(
      `The fake Zotero refused ${path}: ${await response.text()}`,
    );
  }
  return response.json();
}

// A new Zotero account of the test's own: its user ID.
async function addZoteroUser(
  origin: string,
  username: string,
): Promise<string> {
  const { userId } = await control<{ userId: string }>(origin, "users", {
    username,
  });
  return userId;
}

// A collection in the user's library, inside parent when given: its key.
async function addZoteroCollection(
  origin: string,
  userId: string,
  name: string,
  parent?: string,
): Promise<string> {
  const { key } = await control<{ key: string }>(origin, "collections", {
    userId,
    name,
    parent,
  });
  return key;
}

// An item in the user's library: its key.
async function addZoteroItem(
  origin: string,
  userId: string,
  seed: FakeItemSeed,
): Promise<string> {
  const { key } = await control<{ key: string }>(origin, "items", {
    userId,
    ...seed,
  });
  return key;
}

// Changes the item as someone editing it in Zotero would, raising its
// version.
async function editZoteroItem(
  origin: string,
  userId: string,
  itemKey: string,
  edit: {
    readonly bib?: string;
    readonly tags?: readonly FakeTag[];
    readonly collections?: readonly string[];
  },
): Promise<void> {
  await control(origin, "item", { userId, itemKey, ...edit });
}

// The item as the fake holds it now, or null when it is gone.
function zoteroItemNow(
  origin: string,
  userId: string,
  itemKey: string,
): Promise<FakeItemNow | null> {
  return control(origin, "read-item", { userId, itemKey });
}

// A child note on the item, as someone adding it in Zotero would: its key.
async function addZoteroNote(
  origin: string,
  userId: string,
  parentItem: string,
  note: string,
): Promise<string> {
  const { key } = await control<{ key: string }>(origin, "notes", {
    userId,
    parentItem,
    note,
  });
  return key;
}

// Gives the note this HTML, or deletes it, as someone in Zotero would.
async function editZoteroNote(
  origin: string,
  userId: string,
  noteKey: string,
  edit: { readonly note: string } | { readonly remove: true },
): Promise<void> {
  await control(origin, "note", { userId, noteKey, ...edit });
}

// Every note write the fake accepted for the user, in order: the note,
// its item and the HTML written.
function zoteroNoteWrites(
  origin: string,
  userId: string,
): Promise<
  {
    readonly noteKey: string;
    readonly parentItem: string;
    readonly note: string;
  }[]
> {
  return control(origin, "note-writes", { userId });
}

// Gives the note this HTML, as an edit in Zotero would, just before each
// of its next times writes, so each meets a newer version.
async function interfereWithZoteroNote(
  origin: string,
  userId: string,
  noteKey: string,
  { note, times = 1 }: { readonly note: string; readonly times?: number },
): Promise<void> {
  await control(origin, "interfere-note", { userId, noteKey, note, times });
}

// Renames the collection.
async function renameZoteroCollection(
  origin: string,
  userId: string,
  collectionKey: string,
  name: string,
): Promise<void> {
  await control(origin, "collection", { userId, collectionKey, name });
}

// Deletes the collection, leaving its items in the library.
async function deleteZoteroCollection(
  origin: string,
  userId: string,
  collectionKey: string,
): Promise<void> {
  await control(origin, "collection", { userId, collectionKey, remove: true });
}

// Every tag write the fake accepted for the user, in order.
function zoteroTagWrites(
  origin: string,
  userId: string,
): Promise<{ readonly itemKey: string; readonly tags: readonly string[] }[]> {
  return control(origin, "patches", { userId });
}

// Gives the item these tags, as an edit in Zotero would, just before each
// of its next times tag writes, so each meets a newer version.
async function interfereWithZoteroItem(
  origin: string,
  userId: string,
  itemKey: string,
  {
    tags,
    times = 1,
  }: { readonly tags: readonly FakeTag[]; readonly times?: number },
): Promise<void> {
  await control(origin, "interfere", { userId, itemKey, tags, times });
}

// Makes every request for the user fail with status once afterWrites more
// tag writes have succeeded.
async function failZoteroAfter(
  origin: string,
  userId: string,
  afterWrites: number,
  status = 503,
): Promise<void> {
  await control(origin, "fail", { userId, afterWrites, status });
}

// Ends the failure failZoteroAfter set up.
async function recoverZotero(origin: string, userId: string): Promise<void> {
  await control(origin, "recover", { userId });
}

// Holds the user's next requests for collection items until released.
async function holdZoteroItems(origin: string, userId: string): Promise<void> {
  await control(origin, "hold", { userId });
}

// Answers once a request for the user's collection items is held.
async function zoteroItemsHeld(origin: string, userId: string): Promise<void> {
  await control(origin, "held", { userId });
}

// Answers the held requests and stops holding.
async function releaseZoteroItems(
  origin: string,
  userId: string,
): Promise<void> {
  await control(origin, "release", { userId });
}

// Revokes the API key, as deleting it on zotero.org does.
async function revokeZoteroKey(origin: string, apiKey: string): Promise<void> {
  await control(origin, "revoke", { apiKey });
}

// Whether the fake still honors the API key.
async function zoteroKeyLive(origin: string, apiKey: string): Promise<boolean> {
  const key = await control<{ revoked: boolean } | null>(origin, "key", {
    apiKey,
  });
  return key !== null && !key.revoked;
}

// Opens Zotero's authorize page at authorizeUrl and answers it as the
// Zotero user with username would: the callback address Zotero sends them
// back to.
async function answerZoteroAuthorization(
  authorizeUrl: string,
  username: string,
  decision: "accept" | "deny",
): Promise<URL> {
  const page = await fetch(authorizeUrl);
  if (!page.ok) {
    throw new Error(`The authorize page answered ${page.status}`);
  }
  const token = new URL(authorizeUrl).searchParams.get("oauth_token") ?? "";
  const answer = await fetch(new URL("/oauth/authorize", authorizeUrl), {
    method: "POST",
    body: new URLSearchParams([
      ["oauth_token", token],
      ["username", username],
      ["decision", decision],
    ]),
    redirect: "manual",
  });
  const location = answer.headers.get("location");
  if (location === null) {
    throw new Error("Zotero sent the user nowhere");
  }
  return new URL(location);
}

export type { FakeItemNow, FakeItemSeed, FakeTag };
export {
  addZoteroCollection,
  addZoteroItem,
  addZoteroNote,
  addZoteroUser,
  answerZoteroAuthorization,
  deleteZoteroCollection,
  editZoteroItem,
  editZoteroNote,
  failZoteroAfter,
  holdZoteroItems,
  interfereWithZoteroItem,
  interfereWithZoteroNote,
  recoverZotero,
  releaseZoteroItems,
  renameZoteroCollection,
  revokeZoteroKey,
  zoteroItemNow,
  zoteroItemsHeld,
  zoteroKeyLive,
  zoteroNoteWrites,
  zoteroTagWrites,
};
