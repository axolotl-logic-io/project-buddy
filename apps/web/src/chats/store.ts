// Chats, their names and their messages, stored in Postgres; new chats are
// saved by new-chat-store.ts. A project chat is open to its project's owner
// alone; a standalone chat only to the user it names (src/accounts/owner-scope.ts). Every function takes the acting user
// first and reads or writes only chats open to them, so any other chat is
// not found, exactly as an unknown one. Reads check what the
// columns cannot: a chat's construct and name, and each message's role and
// parts. An id from outside the code, such as a route parameter, is looked
// up as a string; anything malformed is not found.
import { safeValidateUIMessages, type UIMessage } from "ai";
import { and, desc, eq, not, type SQL, sql } from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/pg-core";
import { chatOpenTo, messageOpenTo } from "@/accounts/owner-scope.ts";
import { withoutActivityInstructions } from "@/activities/select-activity-contract.ts";
import {
  type Chat,
  chatWithProjectColumns,
  messageColumns,
  type NewMessage,
  openChat,
  openMessage,
  replyUnclaimed,
  toChats,
} from "@/chats/chat-rows.ts";
import {
  type ChatMessage,
  type MessageAuthor,
  toMessageAuthor,
  withAuthor,
} from "@/chats/message-author.ts";
import { getDb } from "@/db/client.ts";
import { chats, messages, projects } from "@/db/tables/projects-and-chats.ts";
import { users } from "@/db/tables/users.ts";
import { logAppError } from "@/errors/error-log.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import {
  type ChatId,
  type MessageId,
  parseChatId,
  parseUserId,
  type UserId,
} from "@/ids.ts";
import { JOURNAL_PART } from "@/journal/journal-message.ts";
import {
  awaitsReply,
  PLAN_CARD_PART,
  PLAN_CHANGE_PART,
} from "@/plan/plan-message.ts";
import { withoutSpellInstructions } from "@/spells/cast-spell-contract.ts";

interface MessageRow {
  id: string;
  role: string;
  parts: unknown;
}

// A message row with its author's columns, which are null on the construct's
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
// construct entered in it, which a reply saved before they were left out may
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
        .select(chatWithProjectColumns())
        .from(chats)
        .leftJoin(projects, eq(chats.projectId, projects.id))
        .where(and(eq(chats.id, chatId), chatOpenTo(owner))),
    ),
  );
  return chat;
}

// The messages of the owner's chat, oldest first, as the model reads them:
// with the instructions of every spell the construct cast in them, which the
// construct follows in later replies. Each user message has its author: the
// user who sent it or, for a message saved with no author, the chat's
// owner, who is its project's user or the standalone chat's user. None if
// the chat is another user's. A stored message whose role or parts are
// invalid is left out and logged. With newest, only that many of the newest
// messages, still oldest first. Only a reply reads these; people read
// listMessages.
export async function listMessagesForModel(
  owner: UserId,
  chatId: ChatId,
  newest?: number,
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
      .orderBy(desc(messages.createdAt), desc(messages.id))
      .limit(newest ?? Number.MAX_SAFE_INTEGER),
  );
  const parsed = await Promise.all(rows.reverse().map(toChatMessage));
  return parsed.filter((message) => message !== undefined);
}

// The messages of the owner's chat as people see them, such as on the
// chat's page: as listMessagesForModel reads them, but without the
// instructions of the spells the construct cast (withoutSpellInstructions).
export async function listMessages(
  owner: UserId,
  chatId: ChatId,
): Promise<ChatMessage[]> {
  const read = await listMessagesForModel(owner, chatId);
  return read.map(withoutSpellInstructions);
}

// The id of the owner's chat's last message when it is a user message that
// no reply answers and no request is replying to, as after a failed reply
// or a request that stopped; the browser may send it again to be answered
// (src/replies/conversation-to-answer.ts). Undefined while a reply to it is
// being made, when the last message is the construct's, for an empty chat, and
// for another user's chat. A plan message, which no reply answers, is never
// a stopped reply's.
export async function readStoppedReply(
  owner: UserId,
  chatId: ChatId,
): Promise<string | undefined> {
  const [last] = await withAppErrors("readStoppedReply", () =>
    getDb()
      .select({
        id: messages.id,
        role: messages.role,
        parts: messages.parts,
        unclaimed: sql<boolean>`coalesce(${replyUnclaimed()}, false)`,
      })
      .from(messages)
      .where(and(eq(messages.chatId, chatId), messageOpenTo(owner)))
      .orderBy(desc(messages.createdAt), desc(messages.id))
      .limit(1),
  );
  if (last === undefined || !last.unclaimed) {
    return undefined;
  }
  const message = await toMessage(last);
  if (message === undefined || !awaitsReply(message)) {
    return undefined;
  }
  return last.id;
}

// True unless the chat's newest message awaits a reply: a user message that
// isn't a plan message (src/plan/plan-message.ts, awaitsReply), whether its
// reply is being made, here or elsewhere, failed or stopped. Nothing may
// come after such a message but its reply, which a retry or "send again"
// asks for with the conversation that ends in it.
export function noReplyAwaited(chatId: ChatId): SQL {
  const newest = new QueryBuilder()
    .select({ role: messages.role, parts: messages.parts })
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(desc(messages.createdAt), desc(messages.id))
    .limit(1)
    .as("newest");
  return sql`not exists (select 1 from ${newest} where ${newest.role} = 'user' and (jsonb_array_length(${newest.parts}) = 0 or exists (select 1 from jsonb_array_elements(${newest.parts}) as part where part->>'type' not in (${PLAN_CHANGE_PART}, ${PLAN_CARD_PART}, ${JOURNAL_PART}))))`;
}

// Whether the owner's chat's newest message awaits a reply (noReplyAwaited);
// false for a chat not open to them.
export async function chatAwaitsReply(
  owner: UserId,
  chatId: ChatId,
): Promise<boolean> {
  const rows = await withAppErrors("chatAwaitsReply", () =>
    getDb()
      .select({ id: chats.id })
      .from(chats)
      .where(and(openChat(owner, chatId), not(noReplyAwaited(chatId)))),
  );
  return rows.length > 0;
}

// Saves a plan message (src/plan/plan-message.ts) in the owner's chat,
// written by the owner, after every message saved so far, with no reply
// claimed or to be made to it, and says whether it did. Nothing is saved in
// a chat that isn't open to the owner, or whose newest message awaits a
// reply (noReplyAwaited).
export async function savePlanMessage(
  owner: UserId,
  chatId: ChatId,
  message: UIMessage,
): Promise<boolean> {
  const saved = await withAppErrors("savePlanMessage", () =>
    getDb()
      .insert(messages)
      .select(
        new QueryBuilder()
          .select(messageColumns(chatId, message, { author: owner }))
          .from(chats)
          .where(and(openChat(owner, chatId), noReplyAwaited(chatId))),
      )
      .onConflictDoNothing()
      .returning({ id: messages.id }),
  );
  return saved.length > 0;
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

// Saves the construct's reply, in the owner's chat, to the message
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
