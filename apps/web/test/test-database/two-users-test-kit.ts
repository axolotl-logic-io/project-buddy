// For the server tests of use_case_private_data: two users side by side in
// the test database, each with their own data, and the account changes
// those tests make. The setup file (vitest.server-setup.ts) deletes
// both users, and what they own, after the test.
import { eq } from "drizzle-orm";
import { onTestFinished } from "vitest";
import { findOrCreateUser, type User } from "@/accounts/users-store.ts";
import { getDb } from "@/db/client.ts";
import { users } from "@/db/tables/users.ts";
import { type TestData, testData } from "./data-test-kit.ts";
import { signIn } from "./session-test-kit.ts";
import { testUser } from "./user-test-kit.ts";

// Two new users and their data. She is signed in; the other user isn't.
interface TwoUsers {
  readonly her: User;
  readonly herData: TestData;
  readonly other: User;
  readonly otherData: TestData;
}

// Two new users of the test's own, with her signed in.
async function twoUsers(): Promise<TwoUsers> {
  const her = await testUser();
  const other = await testUser();
  await signIn(her);
  return { her, herData: testData(her), other, otherData: testData(other) };
}

// Deletes the user's account and everything of theirs: projects, chats,
// memory and buddies go with the row. The stores have no delete, so this
// names the table, as the user kit does.
async function deleteAccount(user: User): Promise<void> {
  await getDb().delete(users).where(eq(users.id, user.id));
}

// A new account at the deleted user's address, deleted when the test
// finishes, since the user kit knows only the account it made.
async function reopenAccount(user: User): Promise<User> {
  const again = await findOrCreateUser(user.email);
  onTestFinished(() => deleteAccount(again));
  return again;
}

export type { TwoUsers };
export { deleteAccount, reopenAccount, twoUsers };
