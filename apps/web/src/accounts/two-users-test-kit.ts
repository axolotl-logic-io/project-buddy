// For the server tests of use_case_private_data: two users side by side in
// the test database, each with their own data, and the requests and account
// changes those tests make. The setup file (vitest.server-setup.ts) deletes
// both users, and what they own, after the test.
import { eq } from "drizzle-orm";
import { onTestFinished } from "vitest";
import { findOrCreateUser, type User } from "@/accounts/users-store.ts";
import { POST } from "@/app/api/chat/route.ts";
import { getDb } from "@/db/client.ts";
import { users } from "@/db/tables/users.ts";
import { afterTasksDone } from "@/test-database/after-test-kit.ts";
import { type TestData, testData } from "@/test-database/data-test-kit.ts";
import {
  requestWithSession,
  signIn,
} from "@/test-database/session-test-kit.ts";
import { testUser } from "@/test-database/user-test-kit.ts";

const CHAT_URL = "http://localhost/api/chat";

// Two new users and their data. She is signed in; the other user isn't.
interface TwoUsers {
  readonly her: User;
  readonly herData: TestData;
  readonly other: User;
  readonly otherData: TestData;
}

// What the chat API answered: its status and its whole body.
interface ChatAnswer {
  readonly status: number;
  readonly body: string;
}

// Two new users of the test's own, with her signed in.
async function twoUsers(): Promise<TwoUsers> {
  const her = await testUser();
  const other = await testUser();
  await signIn(her);
  return { her, herData: testData(her), other, otherData: testData(other) };
}

// Sends text in the chat with this id as the signed-in user, as the chat
// view does, and returns the answer, read to its end once every task it
// started is done. Unlike tutorReply, any status is an answer.
async function postChat(chatId: string, text: string): Promise<ChatAnswer> {
  const response = await POST(
    requestWithSession(CHAT_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: chatId,
        message: {
          id: crypto.randomUUID(),
          role: "user",
          parts: [{ type: "text", text }],
        },
      }),
    }),
  );
  const body = await response.text();
  await afterTasksDone();
  return { status: response.status, body };
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

export type { ChatAnswer, TwoUsers };
export { deleteAccount, postChat, reopenAccount, twoUsers };
