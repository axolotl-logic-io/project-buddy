// Unread marks set and read straight in the test database, for the server
// tests of per-user marks: a mark for a user the app has no way to mark
// yet, such as one who can't read the chat until members can (#626), and
// whether a user's mark is still there when the stores can't show it, and
// the old single mark that a rollback would read.
import { and, eq } from "drizzle-orm";
import type { User } from "@/accounts/users-store.ts";
import { getDb } from "@/db/client.ts";
import { chatUnreads } from "@/db/tables/chat-unreads.ts";
import { chats } from "@/db/tables/projects-and-chats.ts";
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

// How many unread marks the chat has, of every user.
async function marksOn(chatId: ChatId): Promise<number> {
  const rows = await getDb()
    .select({ userId: chatUnreads.userId })
    .from(chatUnreads)
    .where(eq(chatUnreads.chatId, chatId));
  return rows.length;
}

// The chat's old single mark, chats.unread, which only a rollback to the
// build before per-user marks reads.
async function oldUnreadMark(chatId: ChatId): Promise<boolean | undefined> {
  const [row] = await getDb()
    .select({ unread: chats.unread })
    .from(chats)
    .where(eq(chats.id, chatId));
  return row?.unread;
}

export { isUnreadFor, marksOn, markUnreadFor, oldUnreadMark };
