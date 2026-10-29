// Accounts, stored in Postgres. A user is found by the email address they
// signed up with, stored normalized (normalizeEmail), so each address has
// one account however it is typed; and by the id and session epoch a
// session token names (src/auth/session-token.ts).
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client.ts";
import { loginLinks, users } from "@/db/tables/users.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { parseUserId, type UserId } from "@/ids.ts";

interface User {
  readonly id: UserId;
  // Normalized: trimmed and lower-cased.
  readonly email: string;
  readonly role: "user" | "admin";
  // Only sessions signed at this epoch are signed in.
  readonly sessionEpoch: number;
  // The ids of the extras the user has switched off.
  readonly hiddenExtras: readonly string[];
  // What she asked the buddy to call her (src/accounts/user-name.ts), or
  // undefined if she has given no name.
  readonly name: string | undefined;
}

type UserRow = typeof users.$inferSelect;

function userRole(role: string): "user" | "admin" {
  if (role === "admin") {
    return "admin";
  }
  return "user";
}

// The user that the row holds, or undefined if its id is not a UUID, which
// the uuid column never holds.
function toUser(row: UserRow | undefined): User | undefined {
  if (row === undefined) {
    return undefined;
  }
  const id = parseUserId(row.id);
  if (id === undefined) {
    return undefined;
  }
  return {
    id,
    email: row.email,
    role: userRole(row.role),
    sessionEpoch: row.sessionEpoch,
    hiddenExtras: row.hiddenExtras,
    name: row.name ?? undefined,
  };
}

// The address as it is stored: without surrounding whitespace, in lower
// case. Addresses differing only in these are one address here, though the
// part before the @ may be case-sensitive by the standard; no common mail
// service treats it so.
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// The account for the address, or undefined if it has none.
async function findUserByEmail(email: string): Promise<User | undefined> {
  // The operation's name has spaces, since Biome's noSecrets takes the
  // function's name in a string for a secret.
  const [row] = await withAppErrors("find user by email", () =>
    getDb()
      .select()
      .from(users)
      .where(eq(users.email, normalizeEmail(email))),
  );
  return toUser(row);
}

// The user a session names, or undefined if there is no such user or the
// session's epoch is no longer theirs. One read by primary key.
async function readSessionUser(
  id: UserId,
  sessionEpoch: number,
): Promise<User | undefined> {
  const [row] = await withAppErrors("readSessionUser", () =>
    getDb()
      .select()
      .from(users)
      .where(and(eq(users.id, id), eq(users.sessionEpoch, sessionEpoch))),
  );
  return toUser(row);
}

// Signs the user out everywhere: raises their session epoch, which every
// earlier session no longer matches, and deletes the sign-in links sent to
// them, together.
async function endEverySession(id: UserId): Promise<void> {
  const db = getDb();
  await withAppErrors("endEverySession", () =>
    db.batch([
      db
        .update(users)
        .set({ sessionEpoch: sql`${users.sessionEpoch} + 1` })
        .where(eq(users.id, id)),
      db.delete(loginLinks).where(eq(loginLinks.userId, id)),
    ]),
  );
}

// Saves switched as the ids of the extras owner has switched away from their
// default (src/flags/flags.ts), in place of those saved before. The column
// keeps its older name, hidden_extras, to avoid a migration. An owner who
// no longer exists saves nothing.
async function saveHiddenExtras(
  owner: UserId,
  switched: readonly string[],
): Promise<void> {
  await withAppErrors("saveHiddenExtras", () =>
    getDb()
      .update(users)
      .set({ hiddenExtras: [...switched] })
      .where(eq(users.id, owner)),
  );
}

// Saves name as the owner's name, or clears it when name is undefined. The
// name must already be checked (checkUserName); the column's check refuses
// any other. An owner who no longer exists saves nothing.
async function saveUserName(
  owner: UserId,
  name: string | undefined,
): Promise<void> {
  await withAppErrors("saveUserName", () =>
    getDb()
      .update(users)
      .set({ name: name ?? null })
      .where(eq(users.id, owner)),
  );
}

// The owner's name, or undefined if they have none or no longer exist. One
// read by primary key.
async function readUserName(owner: UserId): Promise<string | undefined> {
  const [row] = await withAppErrors("readUserName", () =>
    getDb().select({ name: users.name }).from(users).where(eq(users.id, owner)),
  );
  return row?.name ?? undefined;
}

export type { User };
export {
  endEverySession,
  findUserByEmail,
  normalizeEmail,
  readSessionUser,
  readUserName,
  saveHiddenExtras,
  saveUserName,
};
