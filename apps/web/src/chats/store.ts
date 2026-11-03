// Chats, their names and their messages, stored in Postgres; new chats are
// saved by new-chat-store.ts. A project chat is open to everyone in its
// project, its owner and its members; a standalone chat only to the user it
// names (src/accounts/owner-scope.ts). Every function takes the acting user
// first and reads or writes only chats open to them, so any other chat is
// not found, exactly as an unknown one. Reads check what the
// columns cannot: a chat's buddy and name, and each message's role and
// parts. An id from outside the code, such as a route parameter, is looked
// up as a string; anything malformed is not found.
import { safeValidateUIMessages, type UIMessage } from "ai";
import { and, asc, desc, eq, not, or, sql } from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/pg-core";
import {
  chatOpenTo,
  chatOwnerIs,
  chatUnreadOwnedBy,
  messageOpenTo,
} from "@/accounts/owner-scope.ts";
import { withoutActivityInstructions } from "@/activities/select-activity-contract.ts";
import type { ChatName } from "@/chats/chat-name.ts";
import {
  type Chat,
  chatWithProjectColumns,
  isProjectChat,
  messageColumns,
  type NewMessage,
  openChat,
  openMessage,
  type ProjectChat,
  replyUnclaimed,
  toBuddyWithId,
  toChats,
} from "@/chats/chat-rows.ts";
import {
  type ChatMessage,
  type MessageAuthor,
  toMessageAuthor,
  withAuthor,
} from "@/chats/message-author.ts";
import type { NewChatBuddy } from "@/chats/new-chat-store.ts";
import { unreadMarks } from "@/chats/unread-marks.ts";
import { getDb } from "@/db/client.ts";
import { chatUnreads } from "@/db/tables/chat-unreads.ts";
import { chats, messages, projects } from "@/db/tables/projects-and-chats.ts";
import { users } from "@/db/tables/users.ts";
import { logAppError } from "@/errors/error-log.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import {
  type ChatId,
  type MessageId,
  type ProjectId,
  parseChatId,
  parseUserId,
  type UserId,
} from "@/ids.ts";

interface MessageRow {
  id: string;
  role: string;
  parts: unknown;
}

// A message row with its author's columns, which are null on the buddy's
// messages.
interface AuthoredMessageRow extends MessageRow {
  authorId: string | null;
  authorName: string | null;
  authorEmail: string | null;
}

// The author the row's columns name, or undefined if they name none.
function toAuthor({
  authorId,
  authorName,
  authorEmail,
}: AuthoredMessageRow): MessageAuthor | undefined {
  const id = parseUserId(authorId ?? "");
  if (id === undefined || authorEmail === null) {
    return undefined;
  }
  return toMessageAuthor({ id, name: authorName, email: authorEmail });
}

// The row as a chat message with its author, if it has one; undefined if its
// role or parts are invalid.
async function toChatMessage(
  row: AuthoredMessageRow,
): Promise<ChatMessage | undefined> {
  const message = await toMessage({
    id: row.id,
    role: row.role,
    parts: row.parts,
  });
  if (message === undefined) {
    return undefined;
  }
  const { id, role, parts } = message;
  const author = toAuthor(row);
  if (author === undefined) {
    return { id, role, parts };
  }
  return withAuthor({ id, role, parts }, author);
}

// The row as a UI message, without the instructions of an activity the
// buddy entered in it, which a reply saved before they were left out may
// hold (withoutActivityInstructions); or undefined if its role or parts
// are invalid. The
// log names an invalid message by its id alone, so it holds no message text.
async function toMessage(row: MessageRow): Promise<UIMessage | undefined> {
  const result = await safeValidateUIMessages({ messages: [row] });
  if (result.success) {
    const [message] = result.data;
    if (message === undefined) {
      return undefined;
    }
    return withoutActivityInstructions(message);
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
// another user's. A standalone chat is in no project, so never among them.
export function listChats(
  owner: UserId,
  projectId: ProjectId,
): Promise<ProjectChat[]> {
  return withAppErrors("listChats", async () =>
    toChats(
      await getDb()
        .select(chatWithProjectColumns(owner))
        .from(chats)
        .leftJoin(projects, eq(chats.projectId, projects.id))
        .where(and(eq(chats.projectId, projectId), chatOpenTo(owner)))
        .orderBy(desc(chats.createdAt)),
    ).filter(isProjectChat),
  );
}

// The buddy of the newest chat in the owner's project, as a new chat would
// keep it; undefined if the project has no chats or is another user's.
export async function latestBuddy(
  owner: UserId,
  projectId: ProjectId,
): Promise<NewChatBuddy | undefined> {
  const [row] = await withAppErrors("latestBuddy", () =>
    getDb()
      .select({
        buddyId: chats.buddyId,
        buddyName: chats.buddyName,
        buddyParts: chats.buddyParts,
      })
      .from(chats)
      .where(and(eq(chats.projectId, projectId), chatOpenTo(owner)))
      .orderBy(desc(chats.createdAt), desc(chats.id))
      .limit(1),
  );
  if (row === undefined) {
    return undefined;
  }
  return toBuddyWithId(row);
}

// The owner's chat with this id, or undefined if the id is malformed,
// unknown or another user's.
export async function getChat(
  owner: UserId,
  id: string,
): Promise<Chat | undefined> {
  const chatId = parseChatId(id);
  if (chatId === undefined) {
    return undefined;
  }
  const [chat] = await withAppErrors("getChat", async () =>
    toChats(
      await getDb()
        .select(chatWithProjectColumns(owner))
        .from(chats)
        .leftJoin(projects, eq(chats.projectId, projects.id))
        .where(and(eq(chats.id, chatId), chatOpenTo(owner))),
    ),
  );
  return chat;
}

// The messages of the owner's chat, oldest first, each user message with its
// author: the user who sent it or, for a message saved with no author, the
// chat's owner, who is its project's user or the standalone chat's user.
// None if the chat is another user's. A stored message whose role or parts
// are invalid is left out and logged.
export async function listMessages(
  owner: UserId,
  chatId: ChatId,
): Promise<ChatMessage[]> {
  // The joins only read the author's columns; messageOpenTo is what keeps
  // a message open to the owner.
  const rows = await withAppErrors("listMessages", () =>
    getDb()
      .select({
        id: messages.id,
        role: messages.role,
        parts: messages.parts,
        authorId: users.id,
        authorName: users.name,
        authorEmail: users.email,
      })
      .from(messages)
      .innerJoin(chats, eq(chats.id, messages.chatId))
      .leftJoin(projects, eq(projects.id, chats.projectId))
      .leftJoin(
        users,
        and(
          eq(messages.role, "user"),
          eq(
            users.id,
            sql`coalesce(${messages.userId}, ${chats.userId}, ${projects.userId})`,
          ),
        ),
      )
      .where(and(eq(messages.chatId, chatId), messageOpenTo(owner)))
      .orderBy(asc(messages.createdAt), asc(messages.id)),
  );
  const parsed = await Promise.all(rows.map(toChatMessage));
  return parsed.filter((message) => message !== undefined);
}

// The user as the author of the messages they send, or undefined if they no
// longer exist. One read by primary key.
export async function readMessageAuthor(
  user: UserId,
): Promise<MessageAuthor | undefined> {
  const [row] = await withAppErrors("readMessageAuthor", () =>
    getDb()
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, user)),
  );
  if (row === undefined) {
    return undefined;
  }
  return toMessageAuthor({ id: user, ...row });
}

// Saves the message in the owner's chat, written by the owner, and says
// whether this call inserted it. A message whose id this chat has saved already, such as one the
// browser sent again, is left as it is: of two calls saving one message at
// once, exactly one inserts it. A message whose id another chat's message
// has is not saved: the AI SDK's random ids never collide, so only a broken
// or forged client sends one. Nothing is saved in another user's chat;
// callers find the chat first. The call that inserts the message holds the
// claim to reply to it (claimReply).
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
          .select(
            messageColumns(chatId, message, {
              replyStartedAt: sql`now()`,
              author: owner,
            }),
          )
          .from(chats)
          .where(openChat(owner, chatId)),
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

// Saves the buddy's reply, in the owner's chat, to the message
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
            messageColumns(chatId, reply, {
              createdAt: sql`coalesce((${answeredAt}), now())`,
            }),
          )
          .from(chats)
          .where(openChat(owner, chatId)),
      ),
  );
}

// Claims the reply to the owner's message for this request, and says
// whether it did. Of two calls at once, at most one claims it, and none does
// while a claim from saveMessage or claimReply holds: unreleased, and newer
// than REPLY_CLAIM_SECONDS.
export async function claimReply(
  owner: UserId,
  chatId: ChatId,
  messageId: MessageId,
): Promise<boolean> {
  const claimed = await withAppErrors("claimReply", () =>
    getDb()
      .update(messages)
      .set({ replyStartedAt: sql`now()` })
      .where(and(openMessage(owner, chatId, messageId), replyUnclaimed()))
      .returning({ id: messages.id }),
  );
  return claimed.length > 0;
}

// Releases the claim to reply to the owner's message, so the browser can
// send it again at once, such as after a failed reply.
export async function releaseReply(
  owner: UserId,
  chatId: ChatId,
  messageId: MessageId,
): Promise<void> {
  await withAppErrors("releaseReply", () =>
    getDb()
      .update(messages)
      .set({ replyStartedAt: null })
      .where(openMessage(owner, chatId, messageId)),
  );
}

// Marks the chat unread for each of userIds who can read it, as a check-in
// does for its project's owner. A user named twice, or already marked, keeps
// one mark; a user who can't read the chat gets none. For this release it
// also sets chats.unread when userIds names the chat's owner, for a
// rollback to the build before, which reads only that column.
export async function markChatUnreadFor(
  chatId: ChatId,
  userIds: readonly UserId[],
): Promise<void> {
  const [first, ...rest] = userIds;
  if (first === undefined) {
    return;
  }
  await withAppErrors("markChatUnreadFor", () => {
    const db = getDb();
    return db.batch([
      db
        .insert(chatUnreads)
        .select(unreadMarks(chatId, userIds))
        .onConflictDoNothing(),
      db
        .update(chats)
        .set({ unread: true })
        .where(
          and(
            eq(chats.id, chatId),
            or(chatOwnerIs(first), ...rest.map(chatOwnerIs)),
          ),
        ),
    ]);
  });
}

// Clears the viewer's unread mark on the chat, as the viewer opening it
// does; anyone else's mark stays. A chat already read, unknown or another
// user's is left as it is. For this release, the chat's owner opening it
// also clears chats.unread (markChatUnreadFor).
export async function markChatRead(
  viewer: UserId,
  chatId: ChatId,
): Promise<void> {
  await withAppErrors("markChatRead", () => {
    const db = getDb();
    return db.batch([
      db
        .delete(chatUnreads)
        .where(and(eq(chatUnreads.chatId, chatId), chatUnreadOwnedBy(viewer))),
      db
        .update(chats)
        .set({ unread: false })
        .where(and(eq(chats.id, chatId), chatOwnerIs(viewer), chats.unread)),
    ]);
  });
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
      .where(and(eq(chats.id, chatId), chatOpenTo(owner)))
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
        and(eq(chats.id, chatId), chatOpenTo(owner), not(chats.renamedByHand)),
      ),
  );
}
