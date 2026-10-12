// Chats, their names and their messages, stored in Postgres; new chats are
// saved by new-chat-store.ts. A chat belongs
// to its project's user: every function takes the owner first and reads or
// writes only the owner's chats (src/accounts/owner-scope.ts), so another
// user's chat is not found, exactly as an unknown one. Reads check what the
// columns cannot: a chat's persona and name, and each message's role and
// parts. An id from outside the code, such as a route parameter, is looked
// up as a string; anything malformed is not found.
import { safeValidateUIMessages, type UIMessage } from "ai";
import { and, asc, desc, eq, not, sql } from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/pg-core";
import {
  chatOwnedBy,
  messageOwnedBy,
  projectOwnedBy,
} from "@/accounts/owner-scope.ts";
import type { ChatName } from "@/chats/chat-name.ts";
import {
  type Chat,
  type ChatWithProject,
  messageColumns,
  type NewMessage,
  ownedChat,
  toChats,
} from "@/chats/chat-rows.ts";
import { getDb } from "@/db/client.ts";
import { chats, messages, projects } from "@/db/tables/projects-and-chats.ts";
import { logAppError } from "@/errors/error-log.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import {
  type ChatId,
  type MessageId,
  type ProjectId,
  parseChatId,
  type UserId,
} from "@/ids.ts";

interface MessageRow {
  id: string;
  role: string;
  parts: unknown;
}

// The row as a UI message, or undefined if its role or parts are invalid. The
// log names an invalid message by its id alone, so it holds no message text.
async function toMessage(row: MessageRow): Promise<UIMessage | undefined> {
  const result = await safeValidateUIMessages({ messages: [row] });
  if (result.success) {
    return result.data[0];
  }
  logAppError(
    "unknown",
    "listMessages",
    new Error(`Stored message ${row.id} is not a valid UI message`),
  );
  return undefined;
}

// What saving a message did: inserted it now; found it saved already in this
// chat, such as by another request that sent it at the same time; or saved
// nothing, because another chat's message has its id, which only a broken or
// forged client sends.
type MessageSaveResult = "inserted" | "already-saved" | "id-taken";

export type { MessageSaveResult };

// The chats in the owner's project, newest first; none if the project is
// another user's.
export function listChats(
  owner: UserId,
  projectId: ProjectId,
): Promise<Chat[]> {
  return withAppErrors("listChats", async () =>
    toChats(
      await getDb()
        .select()
        .from(chats)
        .where(and(eq(chats.projectId, projectId), chatOwnedBy(owner)))
        .orderBy(desc(chats.createdAt)),
    ),
  );
}

// The owner's chat with this id and its project's name, or undefined if the
// id is malformed, unknown or another user's.
export async function getChat(
  owner: UserId,
  id: string,
): Promise<ChatWithProject | undefined> {
  const chatId = parseChatId(id);
  if (chatId === undefined) {
    return undefined;
  }
  const [chat] = await withAppErrors("getChat", async () =>
    toChats(
      await getDb()
        .select({
          id: chats.id,
          projectId: chats.projectId,
          personaId: chats.personaId,
          name: chats.name,
          renamedByHand: chats.renamedByHand,
          createdAt: chats.createdAt,
          projectName: projects.name,
        })
        .from(chats)
        .innerJoin(projects, eq(chats.projectId, projects.id))
        .where(and(eq(chats.id, chatId), projectOwnedBy(owner))),
    ),
  );
  return chat;
}

// The messages of the owner's chat, oldest first; none if the chat is
// another user's. A stored message whose role or parts are invalid is left
// out and logged.
export async function listMessages(
  owner: UserId,
  chatId: ChatId,
): Promise<UIMessage[]> {
  const rows = await withAppErrors("listMessages", () =>
    getDb()
      .select({ id: messages.id, role: messages.role, parts: messages.parts })
      .from(messages)
      .where(and(eq(messages.chatId, chatId), messageOwnedBy(owner)))
      .orderBy(asc(messages.createdAt), asc(messages.id)),
  );
  const parsed = await Promise.all(rows.map(toMessage));
  return parsed.filter((message) => message !== undefined);
}

// Saves the message in the owner's chat, and says whether this call inserted
// it. A message whose id this chat has saved already, such as one the
// browser sent again, is left as it is: of two calls saving one message at
// once, exactly one inserts it. A message whose id another chat's message
// has is not saved: the AI SDK's random ids never collide, so only a broken
// or forged client sends one. Nothing is saved in another user's chat;
// callers find the chat first.
export async function saveMessage(
  owner: UserId,
  chatId: ChatId,
  message: NewMessage,
): Promise<MessageSaveResult> {
  const saved = await withAppErrors("saveMessage", () =>
    getDb()
      .insert(messages)
      .select(
        new QueryBuilder()
          .select(messageColumns(chatId, message))
          .from(chats)
          .where(ownedChat(owner, chatId)),
      )
      // Updating the row to itself, only when it is in this chat, makes
      // `returning` tell this chat's row from another chat's. The row an
      // insert creates has no deleting or locking transaction yet (xmax 0);
      // the row the update writes has one.
      .onConflictDoUpdate({
        target: messages.id,
        set: { chatId: sql`excluded.chat_id` },
        setWhere: eq(messages.chatId, sql`excluded.chat_id`),
      })
      .returning({ inserted: sql<boolean>`(xmax = 0)` }),
  );
  const [row] = saved;
  if (row === undefined) {
    return "id-taken";
  }
  if (row.inserted) {
    return "inserted";
  }
  return "already-saved";
}

// Saves the tutor's reply, in the owner's chat, to the message
// answeredMessageId, ordered just after that message however long the
// reply took, so a message sent meanwhile, such as from a reloaded page,
// still comes after both. The time comes from the database's clock, as
// every message's does.
export async function saveReply(
  owner: UserId,
  chatId: ChatId,
  reply: UIMessage,
  answeredMessageId: MessageId,
): Promise<void> {
  const qb = new QueryBuilder();
  const answeredAt = qb
    .select({
      at: sql`${messages.createdAt} + interval '1 microsecond'`,
    })
    .from(messages)
    .where(
      and(eq(messages.chatId, chatId), eq(messages.id, answeredMessageId)),
    );
  await withAppErrors("saveReply", () =>
    getDb()
      .insert(messages)
      .select(
        qb
          .select(
            messageColumns(
              chatId,
              reply,
              sql`coalesce((${answeredAt}), now())`,
            ),
          )
          .from(chats)
          .where(ownedChat(owner, chatId)),
      ),
  );
}

// Names the owner's chat as she typed it. Haiku never renames it after
// this. Whether the chat was found: an unknown chat or another user's is
// left alone.
export async function renameChat(
  owner: UserId,
  chatId: ChatId,
  name: ChatName,
): Promise<boolean> {
  const renamed = await withAppErrors("renameChat", () =>
    getDb()
      .update(chats)
      .set({ name, renamedByHand: true })
      .where(and(eq(chats.id, chatId), chatOwnedBy(owner)))
      .returning({ id: chats.id }),
  );
  return renamed.length > 0;
}

// Names the owner's chat with the name Haiku suggested, unless she has
// renamed it by hand, even while Haiku was answering.
export async function saveAutomaticChatName(
  owner: UserId,
  chatId: ChatId,
  name: ChatName,
): Promise<void> {
  await withAppErrors("saveAutomaticChatName", () =>
    getDb()
      .update(chats)
      .set({ name })
      .where(
        and(eq(chats.id, chatId), chatOwnedBy(owner), not(chats.renamedByHand)),
      ),
  );
}
