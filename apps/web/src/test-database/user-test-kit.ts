// Users of a server test or an e2e test, in the test database. Each is new,
// under an address no other test uses, so tests running beside it never see
// its data. The server tests' setup file (vitest.server-setup.ts) and the
// e2e fixtures (e2e/fixtures.ts) delete them, with everything they own and
// their rate-limit rows, after each test.
import { eq } from "drizzle-orm";
import { endRateLimitWindowsFor } from "@/accounts/rate-limits.ts";
import { findOrCreateUser, type User } from "@/accounts/users-store.ts";
import { getDb } from "@/db/client.ts";
import { users } from "@/db/tables/users.ts";

// The users this test has made and not yet deleted.
const madeUsers: User[] = [];

// A new user of the test's own.
async function testUser(): Promise<User> {
  const user = await findOrCreateUser(
    `server-${crypto.randomUUID()}@example.test`,
  );
  madeUsers.push(user);
  return user;
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

export { deleteTestUsers, testUser };
