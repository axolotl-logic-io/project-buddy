// Users of a server test or an e2e test, in the test database. Each is new,
// under an address no other test uses, so tests running beside it never see
// its data. The server tests' setup file (vitest.server-setup.ts) and the
// e2e fixtures (test/system/fixtures.ts) delete them, with everything they own and
// their rate-limit rows, after each test.
import { eq } from "drizzle-orm";
import { endRateLimitWindowsFor } from "@/accounts/rate-limits.ts";
import {
  findUserByEmail,
  normalizeEmail,
  type User,
} from "@/accounts/users-store.ts";
import { getDb } from "@/db/client.ts";
import { users } from "@/db/tables/users.ts";

// The users this test has made and not yet deleted.
const madeUsers: User[] = [];

// Fixtures may create accounts directly; runtime account creation requires
// accepting a valid invitation and has no public create-by-address export.
async function createTestAccount(email: string): Promise<User> {
  await getDb()
    .insert(users)
    .values({ email: normalizeEmail(email) })
    .onConflictDoNothing();
  const user = await findUserByEmail(email);
  if (user === undefined) {
    throw new Error("The fixture account was not saved");
  }
  return user;
}

// A new user of the test's own.
async function testUser(): Promise<User> {
  const user = await createTestAccount(
    `server-${crypto.randomUUID()}@example.test`,
  );
  madeUsers.push(user);
  return user;
}

// Makes the user an admin, as the migration makes the designated account.
// The site has no way to grant the role, so this names the table.
async function promoteToAdmin(user: User): Promise<User> {
  await getDb()
    .update(users)
    .set({ role: "admin" })
    .where(eq(users.id, user.id));
  return { ...user, role: "admin" };
}

// Deletes one user and everything of theirs: projects, chats, memory and
// buddies go with the row. The stores have no delete, so this names the
// table.
async function deleteTestUser(user: User): Promise<void> {
  await getDb().delete(users).where(eq(users.id, user.id));
  await endRateLimitWindowsFor({ address: user.email });
}

// Deletes every user the test made, with everything they own and their
// address's rate-limit rows.
async function deleteTestUsers(): Promise<void> {
  const made = madeUsers.splice(0);
  await Promise.all(made.map(deleteTestUser));
}

export { createTestAccount, deleteTestUsers, promoteToAdmin, testUser };
