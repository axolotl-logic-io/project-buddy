// Accounts, stored in Postgres. A user is found by the email address they
// signed up with, stored normalized (normalizeEmail), so each address has
// one account however it is typed; and by the id and session epoch a
// session token names (src/auth/session-token.ts).
//
// An account is invited when a quest invitation created it, until its user
// completes sign-up by continuing from an emailed link with a name
// (completeSignUp); every other account is signed up. Account state says
// nothing about which quest invitations the user has accepted.

import { and, eq, sql } from "drizzle-orm";
import { checkUserName } from "@/accounts/user-name.ts";
import { type Database, getDb, inTransaction } from "@/db/client.ts";
import { questInvitations } from "@/db/tables/quest-members.ts";
import { signUpLinks } from "@/db/tables/sign-up-links.ts";
import { signInLinks, users } from "@/db/tables/users.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { parseUserId, type UserId } from "@/ids.ts";

// Whether the account's user has completed sign-up.
type AccountState = "invited" | "signed_up";

interface User {
  readonly id: UserId;
  // Normalized: trimmed and lower-cased.
  readonly email: string;
  readonly role: "user" | "admin";
  // Only sessions signed at this epoch are signed in.
  readonly sessionEpoch: number;
  // What they asked the construct to call them (src/accounts/user-name.ts),
  // or undefined if they have given no name.
  readonly name: string | undefined;
  readonly accountState: AccountState;
}

type UserRow = typeof users.$inferSelect;

function userRole(role: string): "user" | "admin" {
  if (role === "admin") {
    return "admin";
  }
  return "user";
}

function accountState(state: string): AccountState {
  if (state === "invited") {
    return "invited";
  }
  return "signed_up";
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
    name: row.name ?? undefined,
    accountState: accountState(row.accountState),
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
  await withAppErrors("endEverySession", () =>
    inTransaction(async (tx) => {
      await tx
        .update(users)
        .set({ sessionEpoch: sql`${users.sessionEpoch} + 1` })
        .where(eq(users.id, id));
      await tx.delete(signInLinks).where(eq(signInLinks.userId, id));
      // Their pending quest invitations stay pending, in Pending, but their
      // emailed acceptance links, which sign in, stop working.
      await tx
        .update(questInvitations)
        .set({ tokenHash: null, linkExpiresAt: null })
        .where(eq(questInvitations.inviteeId, id));
      await tx
        .delete(signUpLinks)
        .where(
          eq(
            signUpLinks.email,
            sql`(select email from users where id = ${id})`,
          ),
        );
    }),
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

// The id of the address's account, in tx, creating an invited account for
// an address that has none. An existing account, invited or signed up, is
// used as it is.
async function findOrInviteAccount(
  tx: Database,
  email: string,
): Promise<UserId> {
  const normalized = normalizeEmail(email);
  await tx
    .insert(users)
    .values({ email: normalized, accountState: "invited" })
    .onConflictDoNothing({ target: users.email });
  const [row] = await tx
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalized));
  const id = parseUserId(row?.id ?? "");
  if (id === undefined) {
    throw new Error("An invited account was not saved");
  }
  return id;
}

// Completes sign-up for an invited account, in tx, saving the name the
// user gave. A name checkUserName refuses saves nothing and answers false.
// A signed-up account keeps its state and its saved name, and answers true.
async function completeSignUpIn(
  tx: Database,
  id: UserId,
  name: string,
): Promise<boolean> {
  const [row] = await tx
    .select({ accountState: users.accountState })
    .from(users)
    .where(eq(users.id, id));
  if (row === undefined) {
    return false;
  }
  if (row.accountState !== "invited") {
    return true;
  }
  const checked = checkUserName(name);
  if (checked.kind !== "valid") {
    return false;
  }
  await tx
    .update(users)
    .set({
      accountState: "signed_up",
      name: sql`coalesce(${users.name}, ${checked.name})`,
    })
    .where(and(eq(users.id, id), eq(users.accountState, "invited")));
  return true;
}

// completeSignUpIn, on its own.
function completeSignUp(id: UserId, name: string): Promise<boolean> {
  return withAppErrors("complete sign-up", () =>
    completeSignUpIn(getDb(), id, name),
  );
}

export type { AccountState, User };
export {
  completeSignUp,
  completeSignUpIn,
  endEverySession,
  findOrInviteAccount,
  findUserByEmail,
  normalizeEmail,
  readSessionUser,
  readUserName,
  saveUserName,
};
