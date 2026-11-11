// Continuing conversations, stored in Postgres as `chats` rows marked
// continuing: one per quest, open to its owner and members, and one private
// Chat per user, open to that user alone (src/accounts/owner-scope.ts). The
// database's partial unique indexes keep them one per place, so finding or
// making one is atomic: concurrent requests reach the same conversation, and
// only the request that made it may write its opening. A conversation's
// construct is chosen when it is made and kept as it was then; its activity
// changes only as the construct enters another (select_activity). Every
// function takes the acting user first, and a place or conversation not open
// to them is not found, exactly as an unknown one.
import { and, desc, eq, isNull, type SQL, sql } from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/pg-core";
import { chatOpenTo, messageOpenTo } from "@/accounts/owner-scope.ts";
import { currentActivity, newSession } from "@/activities/activity-sessions.ts";
import type { ChatActivity } from "@/activities/chosen-activity.ts";
import {
  type Chat,
  type ChatProject,
  messageColumns,
  type NewMessage,
  openChat,
} from "@/chats/chat-rows.ts";
import {
  type NewChatConstruct,
  newChatRow,
  randomId,
} from "@/chats/new-chat-store.ts";
import { getChat, noReplyAwaited } from "@/chats/store.ts";
import { grantVisualAssets } from "@/constructs/visual-asset-store.ts";
import { getDb, inTransaction } from "@/db/client.ts";
import { activitySessions } from "@/db/tables/activity-sessions.ts";
import { chats, messages } from "@/db/tables/projects-and-chats.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import {
  type ChatId,
  type ProjectId,
  parseChatId,
  type UserId,
} from "@/ids.ts";

// A continuing conversation as the people in it see it: the chat, with its
// construct (chat.construct) and its current activity.
type Conversation = Chat & { readonly activity: ChatActivity };

// What a conversation starts with: its construct, kept as it is now, and its
// first activity.
interface ConversationStart {
  readonly construct: NewChatConstruct;
  readonly activity: ChatActivity;
}

// The conversation found or made, and whether this call made it.
interface FoundConversation {
  readonly conversation: Conversation;
  readonly created: boolean;
}

// A `chats` row that is the continuing conversation of the project, or, with
// no project, of the user.
function continuingIn(project: ProjectId | undefined, user: UserId): SQL {
  if (project === undefined) {
    return sql`${and(eq(chats.continuing, true), eq(chats.userId, user), isNull(chats.projectId))}`;
  }
  return sql`${and(eq(chats.continuing, true), eq(chats.projectId, project))}`;
}

// The conversation with this id, with its current activity, as the owner
// reads it; undefined if it isn't open to them.
async function readConversation(
  owner: UserId,
  id: string,
): Promise<Conversation | undefined> {
  const chat = await getChat(owner, id);
  if (chat === undefined) {
    return undefined;
  }
  return { ...chat, activity: await currentActivity(owner, chat) };
}

// The id of the owner's continuing conversation in project, or, with none,
// their private Chat's; undefined if it has none or isn't open to them.
async function continuingId(
  owner: UserId,
  project: ProjectId | undefined,
): Promise<ChatId | undefined> {
  const [row] = await withAppErrors("continuingId", () =>
    getDb()
      .select({ id: chats.id })
      .from(chats)
      .where(and(continuingIn(project, owner), chatOpenTo(owner))),
  );
  return parseChatId(row?.id ?? "");
}

// The owner's conversation in the quest, or their private Chat with no
// quest; undefined if there is none yet, or the quest isn't open to them.
// Reading never makes one.
async function findConversation(
  owner: UserId,
  project: ProjectId | undefined,
): Promise<Conversation | undefined> {
  const id = await continuingId(owner, project);
  if (id === undefined) {
    return undefined;
  }
  return await readConversation(owner, id);
}

// The conversation of project, open to the owner, or with no project the
// owner's private Chat, made empty with start if it has none: of concurrent
// calls, exactly one makes it, and every call returns the same conversation.
// Undefined if the quest isn't open to the owner.
async function findOrCreateConversation(
  owner: UserId,
  project: ChatProject | undefined,
  start: ConversationStart,
): Promise<FoundConversation | undefined> {
  const id = randomId(parseChatId);
  const created = await withAppErrors("findOrCreateConversation", () =>
    inTransaction(async (db) => {
      const inserted = await db
        .insert(chats)
        .select(
          newChatRow(
            owner,
            { project, construct: start.construct, continuing: true },
            id,
          ),
        )
        .onConflictDoNothing()
        .returning({ id: chats.id });
      if (inserted.length === 0) {
        return false;
      }
      await db
        .insert(activitySessions)
        .select(newSession(owner, id, start.activity, undefined));
      await grantVisualAssets(
        owner,
        db,
        { kind: "adventure", id },
        { parts: start.construct.definition },
      );
      return true;
    }),
  );
  if (created) {
    const conversation = await readConversation(owner, id);
    if (conversation === undefined) {
      return undefined;
    }
    return { conversation, created };
  }
  const found = await findConversation(owner, project?.id);
  if (found === undefined) {
    return undefined;
  }
  return { conversation: found, created: false };
}

// Saves message as the construct's in the owner's conversation, after every
// message saved so far, and says whether it did. Nothing is saved in a
// conversation that isn't open to the owner, or whose newest message awaits
// a reply (noReplyAwaited), which only its reply may follow. A new
// conversation's opening and a check-in are saved this way.
async function appendConstructMessage(
  owner: UserId,
  chatId: ChatId,
  message: NewMessage,
): Promise<boolean> {
  return (
    (await appendAfterReplies(owner, chatId, messageColumns(chatId, message)))
      .length > 0
  );
}

// Inserts the message whose columns are given at the end of the owner's
// conversation unless its newest message awaits a reply, and returns the
// inserted row's id, if any. The conversation's row is locked first, so of
// concurrent appends to one conversation each sees those before it: two
// messages that each wait for a reply never both go in.
function appendAfterReplies(
  owner: UserId,
  chatId: ChatId,
  columns: ReturnType<typeof messageColumns>,
): Promise<{ id: string }[]> {
  return withAppErrors("appendAfterReplies", () =>
    inTransaction(async (db) => {
      await db
        .select({ id: chats.id })
        .from(chats)
        .where(openChat(owner, chatId))
        .for("update");
      return await db
        .insert(messages)
        .select(
          new QueryBuilder()
            .select(columns)
            .from(chats)
            .where(and(openChat(owner, chatId), noReplyAwaited(chatId))),
        )
        .onConflictDoNothing()
        .returning({ id: messages.id });
    }),
  );
}

// Adds message, written by the owner, to the end of the owner's
// conversation, with no reply claimed, so the browser asks for its reply as
// for any message it sends; and returns the id of the message that awaits
// the reply. When the conversation's newest message already awaits a reply
// (noReplyAwaited), such as the same request sent twice, nothing is added
// and that message's id is returned. Nothing is added to a conversation not
// open to the owner.
async function appendUserMessage(
  owner: UserId,
  chatId: ChatId,
  message: NewMessage,
): Promise<string> {
  const saved = await appendAfterReplies(
    owner,
    chatId,
    messageColumns(chatId, message, { author: owner }),
  );
  const [inserted] = saved;
  if (inserted !== undefined) {
    return inserted.id;
  }
  const [newest] = await withAppErrors("appendUserMessage", () =>
    getDb()
      .select({ id: messages.id })
      .from(messages)
      .where(and(eq(messages.chatId, chatId), messageOpenTo(owner)))
      .orderBy(desc(messages.createdAt), desc(messages.id))
      .limit(1),
  );
  return newest?.id ?? message.id;
}

export type { Conversation, ConversationStart, FoundConversation };
export {
  appendConstructMessage,
  appendUserMessage,
  findConversation,
  findOrCreateConversation,
  readConversation,
};
