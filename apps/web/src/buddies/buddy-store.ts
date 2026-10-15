// The buddies of a user's own, stored in Postgres, each its owner's alone:
// every function takes the owner first and reads or writes only the owner's
// buddies. An id from outside the code, such as a route parameter, is looked
// up as a string; anything malformed, unknown or another user's is not found.
// A buddy starts as a clone of a built-in buddy or of another of the
// owner's, and a chat keeps a snapshot of its buddy (src/chats/), so
// editing or deleting a buddy changes no chat.
import { and, asc, eq, type SQL, sql } from "drizzle-orm";
import { buddyOwnedBy } from "@/accounts/owner-scope.ts";
import { parseBuddyParts } from "@/buddies/buddy-parts-schema.ts";
import {
  type BuddyParts,
  type BuddySnapshot,
  getBuddy,
  isBuddyId,
} from "@/buddies/index.ts";
import { getDb } from "@/db/client.ts";
import { buddies } from "@/db/tables/buddies.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { parseUserBuddyId, type UserBuddyId, type UserId } from "@/ids.ts";

// A buddy of the user's own. clonedFrom is the id of the buddy it was
// cloned from, a built-in buddy's or a buddy's of the user's own, which
// may since have been deleted.
interface UserBuddy extends BuddySnapshot {
  readonly id: UserBuddyId;
  readonly clonedFrom: string | undefined;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// One of her buddies as a form offers it: its id and name alone, never its
// parts, so it can be sent to the browser.
type OwnBuddyChoice = Pick<UserBuddy, "id" | "name">;

// What an edit changes: the name, the parts, or both.
interface BuddyEdit {
  readonly name?: string;
  readonly parts?: BuddyParts;
}

type BuddyRow = typeof buddies.$inferSelect;

// The suffix of a clone's name, after its source's.
const COPY_SUFFIX = " (clone)";

// Rows as buddies. A row whose parts are not every part, which only a
// hand-edited row could hold, is skipped, as is one whose id is not a UUID,
// though the uuid column never holds one.
function toBuddies(rows: readonly BuddyRow[]): UserBuddy[] {
  return rows.flatMap((row) => {
    const id = parseUserBuddyId(row.id);
    const parts = parseBuddyParts(row.parts);
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

// A `buddies` row: the owner's buddy with this id.
function ownedBuddy(owner: UserId, id: UserBuddyId): SQL | undefined {
  return and(eq(buddies.id, id), buddyOwnedBy(owner));
}

// The buddy with this id that the owner may clone: a built-in buddy, or
// one of the owner's own.
function cloneSource(
  owner: UserId,
  sourceId: string,
): Promise<BuddySnapshot | undefined> {
  if (isBuddyId(sourceId)) {
    return Promise.resolve(getBuddy(sourceId));
  }
  return getUserBuddy(owner, sourceId);
}

// The owner's buddies, oldest first.
export function listBuddies(owner: UserId): Promise<UserBuddy[]> {
  return withAppErrors("listBuddies", async () =>
    toBuddies(
      await getDb()
        .select()
        .from(buddies)
        .where(buddyOwnedBy(owner))
        .orderBy(asc(buddies.createdAt), asc(buddies.id)),
    ),
  );
}

// The owner's buddy with this id, or undefined if the id is malformed,
// unknown or another user's.
export async function getUserBuddy(
  owner: UserId,
  id: string,
): Promise<UserBuddy | undefined> {
  const buddyId = parseUserBuddyId(id);
  if (buddyId === undefined) {
    return undefined;
  }
  const [buddy] = await withAppErrors("getUserBuddy", async () =>
    toBuddies(
      await getDb().select().from(buddies).where(ownedBuddy(owner, buddyId)),
    ),
  );
  return buddy;
}

// A new buddy of the owner's, a copy of the buddy with the id sourceId,
// named as it is with " (clone)" after: a built-in buddy, or one of the
// owner's own. Undefined, saving nothing, if the source is none of those,
// such as another user's buddy.
export async function cloneBuddy(
  owner: UserId,
  sourceId: string,
): Promise<UserBuddy | undefined> {
  const source = await cloneSource(owner, sourceId);
  if (source === undefined) {
    return undefined;
  }
  const [clone] = await withAppErrors("cloneBuddy", async () =>
    toBuddies(
      await getDb()
        .insert(buddies)
        .values({
          userId: owner,
          name: `${source.name}${COPY_SUFFIX}`,
          parts: source.parts,
          clonedFrom: sourceId.toLowerCase(),
        })
        .returning(),
    ),
  );
  return clone;
}

// The owner's buddy with this id, edited, or undefined, changing nothing,
// if the id is malformed, unknown or another user's.
export async function updateBuddy(
  owner: UserId,
  id: string,
  edit: BuddyEdit,
): Promise<UserBuddy | undefined> {
  const buddyId = parseUserBuddyId(id);
  if (buddyId === undefined) {
    return undefined;
  }
  const [buddy] = await withAppErrors("updateBuddy", async () =>
    toBuddies(
      await getDb()
        .update(buddies)
        .set({ name: edit.name, parts: edit.parts, updatedAt: sql`now()` })
        .where(ownedBuddy(owner, buddyId))
        .returning(),
    ),
  );
  return buddy;
}

// Deletes the owner's buddy with this id. False, deleting nothing, if the
// id is malformed, unknown or another user's.
export async function deleteBuddy(owner: UserId, id: string): Promise<boolean> {
  const buddyId = parseUserBuddyId(id);
  if (buddyId === undefined) {
    return false;
  }
  const deleted = await withAppErrors("deleteBuddy", async () =>
    getDb()
      .delete(buddies)
      .where(ownedBuddy(owner, buddyId))
      .returning({ id: buddies.id }),
  );
  return deleted.length > 0;
}

export type { BuddyEdit, OwnBuddyChoice, UserBuddy };
