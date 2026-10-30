// A user's own prompts, buddies and activities, stored in Postgres, each its
// owner's alone: every function takes the owner first and reads or writes
// only the owner's prompts of one kind. An id from outside the code, such as
// a route parameter, is looked up as a string; anything malformed, unknown,
// another user's or of the other kind is not found. A prompt starts as a
// clone of a built-in prompt or of another of the owner's own, and a chat
// keeps a snapshot of its prompts (src/chats/), so editing or deleting one
// changes no chat. buddy-store.ts and activity-store.ts give each kind its
// own functions.
import { and, asc, eq, type SQL, sql } from "drizzle-orm";
import { ownPromptOwnedBy } from "@/accounts/owner-scope.ts";
import { getDb } from "@/db/client.ts";
import { buddies as ownPrompts } from "@/db/tables/buddies.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { type OwnPromptId, parseOwnPromptId, type UserId } from "@/ids.ts";
import type { PromptKind, PromptSnapshot } from "@/prompts/prompt.ts";

// One kind of prompt, as the store needs it: its kind, how its stored parts
// read, and its built-in prompts, by id.
interface PromptKindStore<Parts> {
  readonly kind: PromptKind;
  readonly parseParts: (stored: unknown) => Parts | undefined;
  readonly builtIn: (id: string) => PromptSnapshot<Parts> | undefined;
}

// An own prompt. clonedFrom is the id of the prompt it was cloned from, a
// built-in prompt's or an own prompt's, which may since have been deleted.
interface OwnPrompt<Parts> extends PromptSnapshot<Parts> {
  readonly id: OwnPromptId;
  readonly clonedFrom: string | undefined;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// One of her prompts as a form offers it: its id and name alone, never its
// parts, so it can be sent to the browser.
type OwnPromptChoice = Pick<OwnPrompt<unknown>, "id" | "name">;

// What an edit changes: the name, the parts, or both.
interface PromptEdit<Parts> {
  readonly name?: string;
  readonly parts?: Parts;
}

type OwnPromptRow = typeof ownPrompts.$inferSelect;

// The suffix of a clone's name, after its source's.
const COPY_SUFFIX = " (clone)";

// Rows as prompts of the kind. A row whose parts are not the kind's, which
// only a hand-edited row could hold, is skipped, as is one whose id is not a
// UUID, though the uuid column never holds one.
function toPrompts<Parts>(
  store: PromptKindStore<Parts>,
  rows: readonly OwnPromptRow[],
): OwnPrompt<Parts>[] {
  return rows.flatMap((row) => {
    const id = parseOwnPromptId(row.id);
    const parts = store.parseParts(row.parts);
    if (id === undefined || parts === undefined) {
      return [];
    }
    return [
      {
        id,
        name: row.name,
        parts,
        clonedFrom: row.clonedFrom ?? undefined,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
    ];
  });
}

// The owner's rows of the kind.
function ownedOfKind(owner: UserId, kind: PromptKind): SQL | undefined {
  return and(ownPromptOwnedBy(owner), eq(ownPrompts.kind, kind));
}

// The owner's row of the kind with this id.
function ownedPrompt(
  owner: UserId,
  kind: PromptKind,
  id: OwnPromptId,
): SQL | undefined {
  return and(eq(ownPrompts.id, id), ownedOfKind(owner, kind));
}

// The owner's prompts of the kind, oldest first.
function listOwnPrompts<Parts>(
  store: PromptKindStore<Parts>,
  owner: UserId,
): Promise<OwnPrompt<Parts>[]> {
  return withAppErrors("listOwnPrompts", async () =>
    toPrompts(
      store,
      await getDb()
        .select()
        .from(ownPrompts)
        .where(ownedOfKind(owner, store.kind))
        .orderBy(asc(ownPrompts.createdAt), asc(ownPrompts.id)),
    ),
  );
}

// The owner's prompt of the kind with this id, or undefined if the id is
// malformed, unknown, another user's or of the other kind.
async function getOwnPrompt<Parts>(
  store: PromptKindStore<Parts>,
  owner: UserId,
  id: string,
): Promise<OwnPrompt<Parts> | undefined> {
  const promptId = parseOwnPromptId(id);
  if (promptId === undefined) {
    return undefined;
  }
  const [prompt] = await withAppErrors("getOwnPrompt", async () =>
    toPrompts(
      store,
      await getDb()
        .select()
        .from(ownPrompts)
        .where(ownedPrompt(owner, store.kind, promptId)),
    ),
  );
  return prompt;
}

// The prompt of the kind with this id that the owner may clone: a built-in
// prompt, or one of the owner's own.
function cloneSource<Parts>(
  store: PromptKindStore<Parts>,
  owner: UserId,
  sourceId: string,
): Promise<PromptSnapshot<Parts> | undefined> {
  const builtIn = store.builtIn(sourceId);
  if (builtIn !== undefined) {
    return Promise.resolve(builtIn);
  }
  return getOwnPrompt(store, owner, sourceId);
}

// A new prompt of the owner's, a copy of the prompt of the kind with the id
// sourceId, named as it is with " (clone)" after: a built-in prompt, or one
// of the owner's own. Undefined, saving nothing, if the source is none of
// those, such as another user's prompt.
async function cloneOwnPrompt<Parts>(
  store: PromptKindStore<Parts>,
  owner: UserId,
  sourceId: string,
): Promise<OwnPrompt<Parts> | undefined> {
  const source = await cloneSource(store, owner, sourceId);
  if (source === undefined) {
    return undefined;
  }
  const [clone] = await withAppErrors("cloneOwnPrompt", async () =>
    toPrompts(
      store,
      await getDb()
        .insert(ownPrompts)
        .values({
          userId: owner,
          kind: store.kind,
          name: `${source.name}${COPY_SUFFIX}`,
          parts: source.parts,
          clonedFrom: sourceId.toLowerCase(),
        })
        .returning(),
    ),
  );
  return clone;
}

// The owner's prompt of the kind with this id, edited, or undefined,
// changing nothing, if the id is malformed, unknown, another user's or of
// the other kind.
async function updateOwnPrompt<Parts>(
  store: PromptKindStore<Parts>,
  owner: UserId,
  id: string,
  edit: PromptEdit<Parts>,
): Promise<OwnPrompt<Parts> | undefined> {
  const promptId = parseOwnPromptId(id);
  if (promptId === undefined) {
    return undefined;
  }
  const [prompt] = await withAppErrors("updateOwnPrompt", async () =>
    toPrompts(
      store,
      await getDb()
        .update(ownPrompts)
        .set({ name: edit.name, parts: edit.parts, updatedAt: sql`now()` })
        .where(ownedPrompt(owner, store.kind, promptId))
        .returning(),
    ),
  );
  return prompt;
}

// Deletes the owner's prompt of the kind with this id. False, deleting
// nothing, if the id is malformed, unknown, another user's or of the other
// kind.
async function deleteOwnPrompt<Parts>(
  store: PromptKindStore<Parts>,
  owner: UserId,
  id: string,
): Promise<boolean> {
  const promptId = parseOwnPromptId(id);
  if (promptId === undefined) {
    return false;
  }
  const deleted = await withAppErrors("deleteOwnPrompt", async () =>
    getDb()
      .delete(ownPrompts)
      .where(ownedPrompt(owner, store.kind, promptId))
      .returning({ id: ownPrompts.id }),
  );
  return deleted.length > 0;
}

export type { OwnPrompt, OwnPromptChoice, PromptEdit, PromptKindStore };
export {
  cloneOwnPrompt,
  deleteOwnPrompt,
  getOwnPrompt,
  listOwnPrompts,
  updateOwnPrompt,
};
