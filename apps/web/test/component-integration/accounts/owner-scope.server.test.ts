// The ownership predicates against the test database: two users side by
// side, each with a quest, a chat in it, a standalone chat, their messages,
// a memory version, a gold balance and its ledger, and a construct. Each predicate, for her,
// selects exactly her rows of the two users', through her quest or, for a
// standalone chat, through the chat's own user. owner-scope-coverage.test.ts
// checks every store builds its queries from these predicates.

import { and, eq, inArray } from "drizzle-orm";
import { describe, expect, test } from "vitest";
import {
  chatOpenTo,
  goldBalanceOwnedBy,
  goldLedgerOwnedBy,
  messageOpenTo,
  ownPromptOwnedBy,
  ownsQuest,
  questOwnedBy,
} from "@/accounts/owner-scope.ts";
import type { User } from "@/accounts/users-store.ts";
import { cloneConstruct } from "@/constructs/construct-store.ts";
import { DEFAULT_CONSTRUCT_ID } from "@/constructs/index.ts";
import { privateChat } from "@/conversations/private-chat.ts";
import { getDb } from "@/db/client.ts";
import { goldBalances, goldLedger } from "@/db/tables/gold.ts";
import { ownPrompts } from "@/db/tables/own-prompts.ts";
import { chats, messages, quests } from "@/db/tables/quests-and-chats.ts";
import { users } from "@/db/tables/users.ts";
import type { ChatId, OwnPromptId, QuestId } from "@/ids.ts";
import {
  type Exchange,
  testData,
} from "../../support/test-database/data-test-kit.ts";
import { twoUsers } from "../test-database/two-users-test-kit.ts";

const EXCHANGE: Exchange = {
  message: "Hello",
  reply: [{ type: "text", text: "Hi" }],
};

// One user's rows, one of each kind an ownership predicate reaches.
interface OwnedRows {
  readonly questId: QuestId;
  readonly projectChatId: ChatId;
  readonly standaloneChatId: ChatId;
  readonly constructId: OwnPromptId;
}

// Saves a row of each kind for user: a quest with a chat and its memory,
// a standalone chat, an exchange in each chat and a construct. Gold comes with
// the account.
async function ownedRows(user: User): Promise<OwnedRows> {
  const data = testData(user);
  const quest = await data.quest();
  const projectChat = await data.chat(quest);
  const standaloneChat = await privateChat(user.id);
  await data.exchanges(projectChat, [EXCHANGE]);
  await data.exchanges(standaloneChat, [EXCHANGE]);
  const construct = await cloneConstruct(user.id, DEFAULT_CONSTRUCT_ID);
  if (construct === undefined) {
    throw new Error("The default construct could not be cloned");
  }
  return {
    questId: quest.id,
    projectChatId: projectChat.id,
    standaloneChatId: standaloneChat.id,
    constructId: construct.id,
  };
}

// Both users, signed in as her, with their rows.
async function bothUsersRows(): Promise<{
  readonly her: User;
  readonly other: User;
  readonly hers: OwnedRows;
  readonly theirs: OwnedRows;
}> {
  const { her, other } = await twoUsers();
  return {
    her,
    other,
    hers: await ownedRows(her),
    theirs: await ownedRows(other),
  };
}

// The ids, in order, for comparing sets of rows.
function sorted(ids: readonly string[]): string[] {
  return ids.toSorted((one, other) => one.localeCompare(other));
}

// Her ids among both users' quests, chats and the chats of messages.
async function ownQuestsAndChats(
  her: User,
  bothQuests: readonly QuestId[],
  bothChats: readonly ChatId[],
): Promise<{
  readonly questIds: readonly string[];
  readonly chatIds: readonly string[];
  readonly messageChatIds: readonly string[];
}> {
  const db = getDb();
  const ownQuests = await db
    .select({ id: quests.id })
    .from(quests)
    .where(and(inArray(quests.id, bothQuests), questOwnedBy(her.id)));
  const ownChats = await db
    .select({ id: chats.id })
    .from(chats)
    .where(and(inArray(chats.id, bothChats), chatOpenTo(her.id)));
  const ownMessages = await db
    .selectDistinct({ chatId: messages.chatId })
    .from(messages)
    .where(and(inArray(messages.chatId, bothChats), messageOpenTo(her.id)));
  return {
    questIds: ownQuests.map(({ id }) => id),
    chatIds: sorted(ownChats.map(({ id }) => id)),
    messageChatIds: sorted(ownMessages.map(({ chatId }) => chatId)),
  };
}

// Her rows among both users' memory versions, gold balances, gold ledgers
// and constructs.
async function ownGoldAndConstructs(
  her: User,
  other: User,
  hers: OwnedRows,
  theirs: OwnedRows,
): Promise<readonly unknown[]> {
  const db = getDb();
  return [
    await db
      .select({ userId: goldBalances.userId })
      .from(goldBalances)
      .where(
        and(
          inArray(goldBalances.userId, [her.id, other.id]),
          goldBalanceOwnedBy(her.id),
        ),
      ),
    await db
      .selectDistinct({ userId: goldLedger.userId })
      .from(goldLedger)
      .where(
        and(
          inArray(goldLedger.userId, [her.id, other.id]),
          goldLedgerOwnedBy(her.id),
        ),
      ),
    await db
      .select({ id: ownPrompts.id })
      .from(ownPrompts)
      .where(
        and(
          inArray(ownPrompts.id, [hers.constructId, theirs.constructId]),
          ownPromptOwnedBy(her.id),
        ),
      ),
  ];
}

// Whether ownsProject holds for her and the quest, on her user row.
async function holds(her: User, questId: QuestId): Promise<boolean> {
  const rows = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, her.id), ownsQuest(her.id, questId)));
  return rows.length > 0;
}

describe("ownership predicates select only the owner's rows", () => {
  test("projects, project chats, standalone chats and their messages", async () => {
    const { her, hers, theirs } = await bothUsersRows();
    const herChats = [hers.projectChatId, hers.standaloneChatId];

    expect(
      await ownQuestsAndChats(
        her,
        [hers.questId, theirs.questId],
        [...herChats, theirs.projectChatId, theirs.standaloneChatId],
      ),
    ).toEqual({
      questIds: [hers.questId],
      chatIds: sorted(herChats),
      messageChatIds: sorted(herChats),
    });
  });

  test("gold and constructs", async () => {
    const { her, other, hers, theirs } = await bothUsersRows();

    expect(await ownGoldAndConstructs(her, other, hers, theirs)).toEqual([
      [{ userId: her.id }],
      [{ userId: her.id }],
      [{ id: hers.constructId }],
    ]);
  });

  test("owning a project holds for her project only", async () => {
    const { her, hers, theirs } = await bothUsersRows();

    expect(await holds(her, hers.questId)).toBe(true);
    expect(await holds(her, theirs.questId)).toBe(false);
  });
});
