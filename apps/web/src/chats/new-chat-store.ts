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
import { storedConstructPrompt } from "@/constructs/construct-definition.ts";
import type { ConstructId, ConstructSnapshot } from "@/constructs/index.ts";
import { grantVisualAssets } from "@/constructs/visual-asset-store.ts";
import { inTransaction, type Transaction } from "@/db/client.ts";
import { chats, messages, quests } from "@/db/tables/quests-and-chats.ts";
import { AppError } from "@/errors/app-error.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { type ChatId, parseChatId, parseQuestId, type UserId } from "@/ids.ts";
import type { QuestName } from "@/quests/quest-name.ts";

// The construct a new chat keeps: the snapshot of its name and parts, and the
// id saved beside it, which is the built-in construct's or, for a construct of
// the user's own, the default construct's, for the build that reads only ids.
type NewChatConstruct = ConstructSnapshot & { readonly id: ConstructId };

// The chat a new chat is: its quest and its construct.
interface NewChat {
  readonly quest: ChatQuest;
  readonly construct: NewChatConstruct;
  // Whether it is its place's one continuing conversation
  // (src/conversations/); a legacy adventure otherwise.
  readonly continuing?: boolean;
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
    constructName: sql`${chat.construct.name}::text`.as("construct_name"),
    constructParts:
      sql`${JSON.stringify(storedConstructPrompt(chat.construct.definition))}::jsonb`.as(
        "construct_parts",
      ),
    name: sql`null::text`.as("name"),
    renamedByHand: sql`false`.as("renamed_by_hand"),
    createdAt: sql`now()`.as("created_at"),
    userId: sql`null::uuid`.as("user_id"),
    continuing: sql`${chat.continuing === true}::boolean`.as("continuing"),
  };
}

// The select that yields the new chat's row, with this id, in its quest
// when that is the owner's, and nothing otherwise.
export function newChatRow(owner: UserId, chat: NewChat, id: ChatId): SQL {
  return new QueryBuilder()
    .select(chatColumns(chat, id))
    .from(quests)
    .where(and(eq(quests.id, chat.quest.id), questOpenTo(owner)))
    .getSQL();
}

export function createChat(owner: UserId, chat: NewChat): Promise<Chat> {
  return withAppErrors("createChat", () =>
    inTransaction(async (tx) => {
      const conversation = await tx
        .insert(chats)
        .select(
          newChatRow(
            owner,
            { ...chat, continuing: true },
            randomId(parseChatId),
          ),
        )
        .onConflictDoNothing()
        .returning();
      let created = conversation;
      if (conversation.length === 0) {
        created = await tx
          .insert(chats)
          .select(newChatRow(owner, chat, randomId(parseChatId)))
          .returning();
      }
      const result = insertedChat(created, chat.quest);
      await grantVisualAssets(
        owner,
        tx,
        { kind: "adventure", id: result.id },
        { parts: chat.construct.definition },
      );
      return result;
    }),
  );
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
      .values({ id: questId, userId: owner, name: questName, dailies })
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
        constructName: chat.construct.name,
        constructParts: storedConstructPrompt(chat.construct.definition),
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
    await grantVisualAssets(
      owner,
      db,
      { kind: "adventure", id },
      { parts: chat.construct.definition },
    );
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
