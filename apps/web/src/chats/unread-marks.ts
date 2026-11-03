// Per-user unread marks on chats, stored in Postgres, as the chat stores
// read and write them: a chat is unread for a user until that user opens
// it, and opening it clears that user's mark alone (markChatUnreadFor and
// markChatRead in store.ts). Only a check-in marks a chat
// (src/chats/start-chat.ts). chats.unread, the single mark before, is no
// longer read; for this release it is still written for the chat's owner,
// so a rollback to the build before finds it right. A later release stops
// writing it and drops it.
import { and, eq, type SQL, sql } from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/pg-core";
import { chatOwnedBy, chatUnreadOwnedBy } from "@/accounts/owner-scope.ts";
import { chatUnreads } from "@/db/tables/chat-unreads.ts";
import { chats, projects } from "@/db/tables/projects-and-chats.ts";
import type { ChatId, UserId } from "@/ids.ts";

// Whether the `chats` row the query reads is unread for viewer, as a
// boolean column.
function unreadFor(viewer: UserId): SQL.Aliased<boolean> {
  return sql<boolean>`exists (${new QueryBuilder()
    .select({ chatId: chatUnreads.chatId })
    .from(chatUnreads)
    .where(
      and(eq(chatUnreads.chatId, chats.id), chatUnreadOwnedBy(viewer)),
    )})`.as("unread");
}

// True when the `chats` row the query reads is still unread for the owner
// of the `projects` row it reads.
function unreadForProjectOwner(): SQL {
  return sql`exists (select 1 from ${chatUnreads} where ${chatUnreads.chatId} = ${chats.id} and ${chatUnreads.userId} = ${projects.userId})`;
}

// The rows, for insert … select into chat_unreads, that mark the chat
// unread for each of userIds who can read it, once each however often
// userIds names them; a user who can't read it gets no mark.
function unreadMarks(chatId: ChatId, userIds: readonly UserId[]): SQL {
  const selects = [...new Set(userIds)].map(
    (userId) =>
      sql`${new QueryBuilder()
        .select({
          chatId: chats.id,
          userId: sql`${userId}::uuid`.as("user_id"),
          createdAt: sql`now()`.as("created_at"),
        })
        .from(chats)
        .where(and(eq(chats.id, chatId), chatOwnedBy(userId)))}`,
  );
  if (selects.length === 0) {
    return sql`select null::uuid, null::uuid, now() where false`;
  }
  return sql.join(selects, sql` union all `);
}

export { unreadFor, unreadForProjectOwner, unreadMarks };
