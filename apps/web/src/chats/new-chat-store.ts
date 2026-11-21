import { and, eq, type SQL, sql } from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/pg-core";
import { questOpenTo } from "@/accounts/owner-scope.ts";
import {
  type Chat,
  type ChatQuest,
  type ChatRow,
  type NewMessage,
  toChats,
} from "@/chats/chat-rows.ts";
import type { Construct } from "@/constructs/index.ts";
import { inTransaction, type Transaction } from "@/db/client.ts";
import { chats, messages, quests } from "@/db/tables/quests-and-chats.ts";
import { AppError } from "@/errors/app-error.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { type ChatId, parseChatId, parseQuestId, type UserId } from "@/ids.ts";
import type { QuestName } from "@/quests/quest-name.ts";

// The built-in construct a new chat is with.
type NewChatConstruct = Construct;

// The chat a new chat is: its quest and its construct.
interface NewChat {
  readonly quest: ChatQuest;
  readonly construct: NewChatConstruct;
}

// A new id, made here rather than by the database, so a batch can insert a
// row and the rows that refer to it together.
function randomId<Id>(parse: (value: string) => Id | undefined): Id {
  const id = parse(crypto.randomUUID());
  if (id === undefined) {
    throw new Error("crypto.randomUUID made no UUID");
  }
  return id;
}

// The chat that inserting it into quest returned. The not-found failure
// when nothing was inserted, because the owner has no such quest.
function insertedChat(rows: readonly ChatRow[], quest: ChatQuest): Chat {
  const [chat] = toChats(
    rows.map((row) => ({ ...row, questName: quest.name })),
  );
  if (chat === undefined) {
    throw new AppError("not-found", new Error("No such quest to chat in"));
  }
  return chat;
}

// The columns of the new chat's row, with this id, in the table's order, as
// insert … select from the chat's quest needs them.
function chatColumns(
  chat: NewChat,
  id: ChatId,
): Record<keyof ChatRow, SQL.Aliased> {
  return {
    id: sql`${id}::uuid`.as("id"),
    questId: sql`${quests.id}`.as("quest_id"),
    constructId: sql`${chat.construct.id}::text`.as("construct_id"),
    spell: sql`null::text`.as("spell"),
    spellSnapshot: sql`null::jsonb`.as("spell_snapshot"),
    spellStartedAt: sql`null::timestamptz`.as("spell_started_at"),
    createdAt: sql`now()`.as("created_at"),
    userId: sql`null::uuid`.as("user_id"),
    continuing: sql`true`.as("continuing"),
  };
}

// The select that yields the new chat's row, its quest's continuing
// conversation with this id, in its quest when that is the owner's, and
// nothing otherwise.
export function newChatRow(owner: UserId, chat: NewChat, id: ChatId): SQL {
  return new QueryBuilder()
    .select(chatColumns(chat, id))
    .from(quests)
    .where(and(eq(quests.id, chat.quest.id), questOpenTo(owner)))
    .getSQL();
}

export function createQuestWithChat(
  owner: UserId,
  questName: QuestName,
  chat: {
    readonly construct: NewChatConstruct;
    readonly opening: NewMessage;
    readonly context?: string;
    readonly dailies?: boolean;
  },
  transaction?: Transaction,
): Promise<Chat | undefined> {
  async function save(db: Transaction): Promise<Chat | undefined> {
    const questId = randomId(parseQuestId);
    const id = randomId(parseChatId);
    const dailies = chat.dailies === true;
    const inserted = await db
      .insert(quests)
      .values({
        id: questId,
        userId: owner,
        name: questName,
        dailies,
        startingContext: chat.context,
      })
      .onConflictDoNothing({
        target: quests.userId,
        where: sql`dailies`,
      })
      .returning({ id: quests.id });
    if (inserted.length === 0) {
      return undefined;
    }
    const created = await db
      .insert(chats)
      .values({
        id,
        questId,
        continuing: true,
        constructId: chat.construct.id,
      })
      .returning();
    if (chat.context !== undefined && chat.context !== "") {
      await db.insert(messages).values({
        id: crypto.randomUUID(),
        chatId: id,
        userId: owner,
        role: "user",
        parts: [{ type: "text", text: chat.context }],
        createdAt: sql`now() - interval '1 microsecond'`,
      });
    }
    await db.insert(messages).values({
      id: chat.opening.id,
      chatId: id,
      role: chat.opening.role,
      parts: chat.opening.parts,
    });
    return insertedChat(created, { id: questId, name: questName });
  }
  return withAppErrors("createQuestWithChat", () => {
    if (transaction !== undefined) {
      return save(transaction);
    }
    return inTransaction(save);
  });
}

export type { NewChatConstruct };
export { randomId };
