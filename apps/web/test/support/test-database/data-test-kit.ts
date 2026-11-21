// Data a server test needs before it starts, made through the app's stores
// in the test database, for server tests and for test/system/fixtures.ts's
// testData. Quests and chats belong to a test user and go when the user
// is deleted; manual sections are added beside the others and removed by
// removeTestData, which the setup file (vitest.server-setup.ts) and the e2e
// fixture call after each test.

import type { UIMessage } from "ai";
import { and, eq } from "drizzle-orm";
import { questOwnedBy } from "@/accounts/owner-scope.ts";
import type { User } from "@/accounts/users-store.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import { saveMessage, saveReply } from "@/chats/store.ts";
import {
  type ConstructId,
  DEFAULT_CONSTRUCT_ID,
  getConstruct,
} from "@/constructs/index.ts";
import { findOrCreateConversation } from "@/conversations/conversation-store.ts";
import { getDb } from "@/db/client.ts";
import { messages, quests } from "@/db/tables/quests-and-chats.ts";
import type { ChatId, UserId } from "@/ids.ts";
import { QUEST_NAME } from "@/quests/quest-name.ts";
import { createQuest, type Quest } from "@/quests/store.ts";
import { messageIdFixture } from "../id-fixtures.ts";

const NAME_SUFFIX_LENGTH = 8;

// One of her messages and the construct's reply to it, as the reply's stream
// saves them. author, another user, writes the message instead, as a
// member of a team quest would; it is recorded straight in the messages
// table, since the chat isn't theirs.
interface Exchange {
  readonly message: string;
  readonly reply: readonly UIMessage["parts"][number][];
  readonly author?: User;
}

// Quests and chats of one user, and sections of the manual.
interface TestData {
  // A new quest, named name, or a unique name when name is missing.
  // Supply createdAt when a test needs a fixed chronological order.
  readonly quest: (name?: string, createdAt?: Date) => Promise<Quest>;
  // The quest's conversation, made with constructId or the default
  // construct when the quest has none yet.
  readonly chat: (quest: Quest, constructId?: ConstructId) => Promise<Chat>;
  // Makes the chat, a quest chat, its quest's interview chat.
  // Saves the exchanges in the chat, one after another, so they keep their
  // order.
  readonly exchanges: (
    chat: { readonly id: ChatId },
    exchanges: readonly Exchange[],
  ) => Promise<void>;
}

// Removes what the test added to the manual index.

function uniqueSuffix(): string {
  return crypto.randomUUID().slice(0, NAME_SUFFIX_LENGTH);
}

// Puts the owner's chat in the quest interview from its start, as the
// chat a quest is created with is: its quest's interview chat.
async function saveExchanges(
  owner: UserId,
  chatId: ChatId,
  exchanges: readonly Exchange[],
): Promise<void> {
  const [exchange, ...rest] = exchanges;
  if (exchange === undefined) {
    return;
  }
  const messageId = messageIdFixture();
  await saveMessage(owner, chatId, {
    id: messageId,
    role: "user",
    parts: [{ type: "text", text: exchange.message }],
  });
  if (exchange.author !== undefined) {
    await getDb()
      .update(messages)
      .set({ userId: exchange.author.id })
      .where(and(eq(messages.id, messageId), eq(messages.chatId, chatId)));
  }
  await saveReply(
    owner,
    chatId,
    { id: messageIdFixture(), role: "assistant", parts: [...exchange.reply] },
    messageId,
  );
  await saveExchanges(owner, chatId, rest);
}

// A quest of the owner's named name, made at createdAt when it is given.
async function testQuest(
  owner: UserId,
  name: string,
  createdAt: Date | undefined,
): Promise<Quest> {
  const quest = await createQuest(owner, QUEST_NAME.parse(name));
  if (createdAt === undefined) {
    return quest;
  }
  await getDb()
    .update(quests)
    .set({ createdAt })
    .where(and(eq(quests.id, quest.id), questOwnedBy(owner)));
  return { ...quest, createdAt };
}

async function testChat(
  owner: UserId,
  quest: Quest,
  constructId: ConstructId,
): Promise<Chat> {
  const found = await findOrCreateConversation(owner, quest, {
    construct: getConstruct(constructId),
  });
  if (found === undefined) {
    throw new Error("No such quest to chat in");
  }
  return found.conversation;
}

// The data of user, a test user from testUser.
function testData(user: User): TestData {
  return {
    quest: (
      name = `Test project ${uniqueSuffix()}`,
      createdAt?: Date,
    ): Promise<Quest> => testQuest(user.id, name, createdAt),
    chat: (
      quest: Quest,
      constructId: ConstructId = DEFAULT_CONSTRUCT_ID,
    ): Promise<Chat> => testChat(user.id, quest, constructId),
    exchanges: (
      chat: { readonly id: ChatId },
      exchanges: readonly Exchange[],
    ): Promise<void> => saveExchanges(user.id, chat.id, exchanges),
  };
}

export type { Exchange, TestData };
export { testData };
