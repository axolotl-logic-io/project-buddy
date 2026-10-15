// Rows of the chats and messages tables, as the chat stores read and write
// them. Reads check what the columns cannot: a chat's buddy and name.
import type { UIMessage } from "ai";
import { and, eq, isNull, lt, or, type SQL, sql } from "drizzle-orm";
import { chatOwnedBy, messageOwnedBy } from "@/accounts/owner-scope.ts";
import { parseBuddyParts } from "@/buddies/buddy-parts-schema.ts";
import {
  type BuddyId,
  type BuddySnapshot,
  DEFAULT_BUDDY_ID,
  getBuddy,
  isBuddyId,
  snapshotOf,
} from "@/buddies/index.ts";
import { type ChatName, parseChatName } from "@/chats/chat-name.ts";
import { chats, messages } from "@/db/tables/projects-and-chats.ts";
import {
  type ChatId,
  type MessageId,
  type ProjectId,
  parseChatId,
  parseProjectId,
  type UserId,
} from "@/ids.ts";

interface Chat {
  id: ChatId;
  projectId: ProjectId;
  // The buddy as it was when the chat started.
  buddy: BuddySnapshot;
  createdAt: Date;
  // Undefined until Claude Haiku or she first names the chat.
  name: ChatName | undefined;
  // Whether she has renamed the chat, after which Haiku never renames it.
  renamedByHand: boolean;
}

// A chat with its project's name, and whether it is the project's interview
// chat (projects.interview_chat_id), the only chat whose prompt holds the
// interview.
type ChatWithProject = Chat & { projectName: string; isInterviewChat: boolean };

type ChatRow = typeof chats.$inferSelect;

// A message to save as it is, with an id from the AI SDK.
type NewMessage = UIMessage & { readonly id: MessageId };

// A stored buddy id that no buddy file has any more, because the buddy
// was retired, reads as the default buddy, so its chats keep working.
function toBuddyId(stored: string): BuddyId {
  if (isBuddyId(stored)) {
    return stored;
  }
  return DEFAULT_BUDDY_ID;
}

// The columns a chat's buddy is read from.
type BuddyColumns = "buddyId" | "buddyName" | "buddyParts";

// A chat's buddy: its snapshot or, for a chat saved before snapshots, whose
// snapshot columns are null, the built-in buddy of its id. A snapshot whose
// parts are not every part, which only a hand-edited row could hold, reads
// the same way.
function toBuddy({
  buddyId,
  buddyName,
  buddyParts,
}: Pick<ChatRow, BuddyColumns>): BuddySnapshot {
  const parts = parseBuddyParts(buddyParts);
  if (buddyName !== null && parts !== undefined) {
    return { name: buddyName, parts };
  }
  return snapshotOf(getBuddy(toBuddyId(buddyId)));
}

// Rows as chats, keeping any further columns, such as the project's name. A
// row whose ids are not UUIDs is skipped, though the uuid columns never hold
// one. A stored name that is not a chat name, which only a hand-edited row
// could hold, reads as no name.
function toChats<Row extends ChatRow>(
  rows: readonly Row[],
): (Chat & Omit<Row, keyof ChatRow>)[] {
  return rows.flatMap(
    ({
      id: storedId,
      projectId: storedProjectId,
      buddyId,
      buddyName,
      buddyParts,
      name,
      renamedByHand,
      createdAt,
      ...further
    }) => {
      const id = parseChatId(storedId);
      const projectId = parseProjectId(storedProjectId);
      if (id === undefined || projectId === undefined) {
        return [];
      }
      return [
        {
          ...further,
          id,
          projectId,
          buddy: toBuddy({ buddyId, buddyName, buddyParts }),
          name: parseChatName(name ?? ""),
          renamedByHand,
          createdAt,
        },
      ];
    },
  );
}

// A `chats` row: the owner's chat with this id.
function ownedChat(owner: UserId, chatId: ChatId): SQL | undefined {
  return and(eq(chats.id, chatId), chatOwnedBy(owner));
}

// A `messages` row: the owner's message with this id in this chat.
function ownedMessage(
  owner: UserId,
  chatId: ChatId,
  messageId: MessageId,
): SQL | undefined {
  return and(
    eq(messages.id, messageId),
    eq(messages.chatId, chatId),
    messageOwnedBy(owner),
  );
}

// How long a claim to reply to a message lasts, in seconds: the longest a
// reply may run, the chat route's maxDuration (src/app/api/chat/route.ts),
// which must stay a literal there. A claim older than this was held by a
// request that was stopped before it could release it.
const REPLY_CLAIM_SECONDS = 300;

// A `messages` row whose reply no request has claimed (claimReply in
// store.ts): never claimed, released, or claimed longer ago than
// REPLY_CLAIM_SECONDS.
function replyUnclaimed(): SQL | undefined {
  return or(
    isNull(messages.replyStartedAt),
    lt(
      messages.replyStartedAt,
      sql`now() - make_interval(secs => ${REPLY_CLAIM_SECONDS})`,
    ),
  );
}

// The columns of a message row to insert … select, keyed as the table's are.
type MessageColumns = {
  readonly [Column in keyof Required<
    typeof messages.$inferInsert
  >]: SQL.Aliased;
};

// A message's row for insert … select, saved now or at createdAt, with no
// reply being made to it unless replyStartedAt says when one started.
function messageColumns(
  chatId: ChatId,
  message: UIMessage,
  {
    createdAt = sql`now()`,
    replyStartedAt = sql`null::timestamptz`,
  }: { createdAt?: SQL; replyStartedAt?: SQL } = {},
): MessageColumns {
  return {
    id: sql`${message.id}::text`.as("id"),
    chatId: sql`${chatId}::uuid`.as("chat_id"),
    role: sql`${message.role}::text`.as("role"),
    parts: sql`${JSON.stringify(message.parts)}::jsonb`.as("parts"),
    replyStartedAt: replyStartedAt.as("reply_started_at"),
    createdAt: createdAt.as("created_at"),
  };
}

export type { Chat, ChatRow, ChatWithProject, NewMessage };
export {
  messageColumns,
  ownedChat,
  ownedMessage,
  REPLY_CLAIM_SECONDS,
  replyUnclaimed,
  toChats,
};
