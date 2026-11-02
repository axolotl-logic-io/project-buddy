// Unread marks set and read straight in the test database, for the server
// tests of per-user marks: a mark for a user the app has no way to mark
// yet, such as one who can't read the chat until members can (#626), and
// whether a user's mark is still there when the stores can't show it.
import { and, eq } from "drizzle-orm";
import type { User } from "@/accounts/users-store.ts";
import { getDb } from "@/db/client.ts";
import { chatUnreads } from "@/db/tables/chat-unreads.ts";
import type { ChatId } from "@/ids.ts";

// Marks the chat unread for the user, as a check-in marks it.
async function markUnreadFor(chatId: ChatId, user: User): Promise<void> {
  await getDb()
    .insert(chatUnreads)
    .values({ chatId, userId: user.id })
    .onConflictDoNothing();
}

// Whether the chat is still unread for the user.
async function isUnreadFor(chatId: ChatId, user: User): Promise<boolean> {
  const rows = await getDb()
    .select({ chatId: chatUnreads.chatId })
    .from(chatUnreads)
    .where(
      and(eq(chatUnreads.chatId, chatId), eq(chatUnreads.userId, user.id)),
    );
  return rows.length > 0;
}

export { isUnreadFor, markUnreadFor };
