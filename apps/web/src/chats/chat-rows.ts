// Rows of the chats and messages tables, as the chat stores read and write
// them. Every chat the site reads is a quest's conversation; a chat that
// Start Day parked outside its quest reads as not found.

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
import {
  type Construct,
  getConstruct,
  isConstructId,
} from "@/constructs/index.ts";
import { chats, messages, quests } from "@/db/tables/quests-and-chats.ts";
import {
  type ChatId,
  type MessageId,
  parseChatId,
  parseQuestId,
  type QuestId,
  type UserId,
} from "@/ids.ts";
import { SPELL_ID, type SpellId } from "@/spells/spell.ts";
import {
  SPELL_SNAPSHOT,
  type SpellSnapshot,
} from "@/spells/spell-definition.ts";

// The quest a chat is in: its id and name.
interface ChatQuest {
  readonly id: QuestId;
  readonly name: string;
}

interface Chat {
  readonly id: ChatId;
  readonly spell?: SpellId | undefined;
  readonly activeSpell?: SpellSnapshot | undefined;
  readonly spellStartedAt?: string | undefined;
  // The quest the chat is the conversation of.
  readonly quest: ChatQuest;
  // The built-in construct the chat is with.
  readonly construct: Construct;
  readonly createdAt: Date;
}

type ChatRow = typeof chats.$inferSelect;

type ChatRowWithQuest = ChatRow & {
  readonly questName: string | null;
};

// A message to save as it is, with an id from the AI SDK.
type NewMessage = UIMessage & { readonly id: MessageId };

// A chat's construct: the built-in construct its id names. The
// chats_construct_id_known check keeps every stored id a construct's.
function toConstruct({ constructId }: Pick<ChatRow, "constructId">): Construct {
  if (!isConstructId(constructId)) {
    throw new Error(`Unknown construct id: ${constructId}`);
  }
  return getConstruct(constructId);
}

// A chat's quest, or undefined for a parked chat, or for a quest id
// that is not a UUID or has no quest's name, which the foreign key forbids.
function toQuest({
  questId,
  questName,
}: Pick<ChatRowWithQuest, "questId" | "questName">): ChatQuest | undefined {
  if (questId === null || questName === null) {
    return undefined;
  }
  const id = parseQuestId(questId);
  if (id === undefined) {
    return undefined;
  }
  return { id, name: questName };
}

// Rows, with their quests' columns, as chats. A row that is not a chat
// (toQuest), or whose id is not a UUID, though the uuid column never
// holds one, is skipped.
function toChats(rows: readonly ChatRowWithQuest[]): Chat[] {
  return rows.flatMap((row) => {
    const id = parseChatId(row.id);
    const quest = toQuest(row);
    if (id === undefined || quest === undefined) {
      return [];
    }
    return [
      {
        id,
        spell: SPELL_ID.optional().parse(row.spell ?? undefined),
        activeSpell: SPELL_SNAPSHOT.optional().parse(
          row.spellSnapshot ?? undefined,
        ),
        spellStartedAt: row.spellStartedAt ?? undefined,
        quest,
        construct: toConstruct(row),
        createdAt: row.createdAt,
      },
    ];
  });
}

// The columns a chat is read from and its quest's name, which a left join
// of quests on chats.quest_id gives, null in a parked chat. The join
// only reads the quest's columns;
// chatOpenTo is what keeps a chat open to its reader.
function chatWithQuestColumns(): {
  readonly questName: typeof quests.name;
} & ReturnType<typeof getTableColumns<typeof chats>> {
  return { ...getTableColumns(chats), questName: quests.name };
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
// written by author. A user message needs one; the construct's has none.
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

export type { Chat, ChatQuest, ChatRow, NewMessage };
export {
  chatWithQuestColumns,
  messageColumns,
  openChat,
  openMessage,
  REPLY_CLAIM_SECONDS,
  replyUnclaimed,
  toChats,
};
