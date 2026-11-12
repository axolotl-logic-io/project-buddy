// Rows of the chats and messages tables, as the chat stores read and write
// them. Reads check what the columns cannot: a chat's construct. A chat
// is in a quest, a quest chat, or in none, a standalone chat; both are
// one type, Chat, whose quest is undefined in a standalone chat.

import type { UIMessage } from "ai";
import {
  and,
  eq,
  getTableColumns,
  isNull,
  lt,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { chatOpenTo, messageOpenTo } from "@/accounts/owner-scope.ts";
import { parseConstructDefinition } from "@/constructs/construct-definition.ts";
import {
  type ConstructId,
  type ConstructSnapshot,
  DEFAULT_CONSTRUCT_ID,
  getConstruct,
  isConstructId,
  snapshotOf,
} from "@/constructs/index.ts";
import { activitySessions } from "@/db/tables/activity-sessions.ts";
import { chats, messages, quests } from "@/db/tables/quests-and-chats.ts";
import {
  type ChatId,
  type MessageId,
  parseChatId,
  parseQuestId,
  type QuestId,
  type UserId,
} from "@/ids.ts";

// The quest a chat is in: its id and name.
interface ChatQuest {
  readonly id: QuestId;
  readonly name: string;
}

interface Chat {
  readonly id: ChatId;
  readonly activityName?: string | undefined;
  // The chat's quest, or undefined in a standalone chat.
  readonly quest: ChatQuest | undefined;
  // The construct as it was when the chat started.
  readonly construct: ConstructSnapshot;
  readonly createdAt: Date;
}

// A chat known to be in a quest, such as one of a quest's chats.
type QuestChat = Chat & { readonly quest: ChatQuest };

type ChatRow = typeof chats.$inferSelect;

// A chats row with its quest's name, which is null for a standalone chat,
// and its current activity's name (chatColumnsFor).
type ChatRowWithQuest = ChatRow & {
  readonly questName: string | null;
  readonly activityName?: string | null;
};

// A message to save as it is, with an id from the AI SDK.
type NewMessage = UIMessage & { readonly id: MessageId };

// A stored construct id that no construct file has any more, because the construct
// was retired, reads as the default construct, so its chats keep working.
function toConstructId(stored: string): ConstructId {
  if (isConstructId(stored)) {
    return stored;
  }
  return DEFAULT_CONSTRUCT_ID;
}

// The columns a chat's construct is read from.
type ConstructColumns = "constructId" | "constructName" | "constructParts";

// A chat's construct: its snapshot or, for a chat saved before snapshots, whose
// snapshot columns are null, the built-in construct of its id. A snapshot whose
// parts are not every part, which only a hand-edited row could hold, reads
// the same way.
function toConstruct({
  constructId,
  constructName,
  constructParts,
}: Pick<ChatRow, ConstructColumns>): ConstructSnapshot {
  const parts = parseConstructDefinition(constructParts);
  if (constructName !== null && parts !== undefined) {
    return { name: constructName, definition: parts };
  }
  return snapshotOf(getConstruct(toConstructId(constructId)));
}

// A chat's construct as a new chat would keep it: its snapshot (toConstruct) and
// the id saved beside it.
function toConstructWithId(
  row: Pick<ChatRow, ConstructColumns>,
): ConstructSnapshot & { readonly id: ConstructId } {
  return { ...toConstruct(row), id: toConstructId(row.constructId) };
}

// A chat's quest: { quest: undefined } for a standalone chat, or
// undefined for a row that is neither, which the chats_one_owner check and
// the foreign key forbid: a quest id that is not a UUID or has no
// quest's name, or a row with neither a quest nor a user.
function toQuest({
  questId,
  questName,
  userId,
}: Pick<ChatRowWithQuest, "questId" | "questName" | "userId">):
  | { readonly quest: ChatQuest | undefined }
  | undefined {
  if (questId === null) {
    if (userId === null) {
      return undefined;
    }
    return { quest: undefined };
  }
  const id = parseQuestId(questId);
  if (id === undefined || questName === null) {
    return undefined;
  }
  return { quest: { id, name: questName } };
}

// Rows, with their quests' columns, as chats. A row that is not a chat
// (toQuest), or whose id is not a UUID, though the uuid column never
// holds one, is skipped.
function toChats(rows: readonly ChatRowWithQuest[]): Chat[] {
  return rows.flatMap((row) => {
    const id = parseChatId(row.id);
    const place = toQuest(row);
    if (id === undefined || place === undefined) {
      return [];
    }
    return [
      {
        id,
        activityName: row.activityName ?? undefined,
        quest: place.quest,
        construct: toConstruct(row),
        createdAt: row.createdAt,
      },
    ];
  });
}

// The columns a chat is read from: its row, with its current activity's
// name.
function chatColumnsFor(): ReturnType<typeof getTableColumns<typeof chats>> & {
  readonly activityName: SQL.Aliased<string | null>;
} {
  return {
    ...getTableColumns(chats),
    activityName: sql<string | null>`(select ${activitySessions.activityName}
      from ${activitySessions} where ${activitySessions.chatId} = ${chats.id}
      order by ${activitySessions.createdAt} desc, ${activitySessions.id} desc limit 1)`.as(
      "current_activity_name",
    ),
  };
}

// The columns a chat is read from (chatColumnsFor) and its
// quest's name, which a left join of quests on chats.quest_id gives,
// null in a standalone chat. The join only reads the quest's columns;
// chatOpenTo is what keeps a chat open to its reader.
function chatWithQuestColumns(): {
  readonly questName: typeof quests.name;
} & ReturnType<typeof chatColumnsFor> {
  return { ...chatColumnsFor(), questName: quests.name };
}

// Whether the chat is in a quest.
function isQuestChat(chat: Chat): chat is QuestChat {
  return chat.quest !== undefined;
}

// A `chats` row: the owner's chat with this id.
function openChat(owner: UserId, chatId: ChatId): SQL | undefined {
  return and(eq(chats.id, chatId), chatOpenTo(owner));
}

// A `messages` row: the owner's message with this id in this chat.
function openMessage(
  owner: UserId,
  chatId: ChatId,
  messageId: MessageId,
): SQL | undefined {
  return and(
    eq(messages.id, messageId),
    eq(messages.chatId, chatId),
    messageOpenTo(owner),
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
// reply being made to it unless replyStartedAt says when one started, and
// written by author, or with no author recorded, which reads as the chat's
// owner.
function messageColumns(
  chatId: ChatId,
  message: UIMessage,
  {
    createdAt = sql`now()`,
    replyStartedAt = sql`null::timestamptz`,
    author,
  }: { createdAt?: SQL; replyStartedAt?: SQL; author?: UserId } = {},
): MessageColumns {
  return {
    id: sql`${message.id}::text`.as("id"),
    chatId: sql`${chatId}::uuid`.as("chat_id"),
    role: sql`${message.role}::text`.as("role"),
    parts: sql`${JSON.stringify(message.parts)}::jsonb`.as("parts"),
    userId: sql`${author ?? null}::uuid`.as("user_id"),
    replyStartedAt: replyStartedAt.as("reply_started_at"),
    createdAt: createdAt.as("created_at"),
  };
}

export type {
  Chat,
  ChatQuest,
  ChatRow,
  ChatRowWithQuest,
  NewMessage,
  QuestChat,
};
export {
  chatWithQuestColumns,
  isQuestChat,
  messageColumns,
  openChat,
  openMessage,
  REPLY_CLAIM_SECONDS,
  replyUnclaimed,
  toChats,
  toConstructWithId,
};
