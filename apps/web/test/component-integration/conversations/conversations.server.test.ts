// Quests' and Chat's continuing conversations, in the test database with
// the mock construct: one per quest and one private Chat per user, found or
// made atomically, never made by reading, open to the quest's people or to
// the Chat's user alone, and the user's one Dailies quest, reused by its
// mark whatever its name.

import { eq } from "drizzle-orm";
import { describe, expect, test } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import { getChat, listMessages } from "@/chats/store.ts";
import { getConstruct } from "@/constructs/index.ts";
import { startDailies } from "@/conversations/dailies.ts";
import { privateChat } from "@/conversations/private-chat.ts";
import { resolveConversation } from "@/conversations/resolve.ts";
import {
  readQuestConversation,
  startQuest,
  startQuestConversation,
} from "@/conversations/start-quest.ts";
import { getDb } from "@/db/client.ts";
import { chats } from "@/db/tables/quests-and-chats.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import {
  listMilestones,
  recordMilestone,
} from "@/milestones/milestone-store.ts";
import { QUEST_NAME } from "@/quests/quest-name.ts";
import { listQuests, renameQuest } from "@/quests/store.ts";
import {
  CONVERSATION_WINDOW,
  conversationToAnswer,
} from "@/replies/conversation-to-answer.ts";
import {
  type Exchange,
  testData,
} from "../../support/test-database/data-test-kit.ts";
import { goldSpent } from "../../support/test-database/gold-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import {
  messageText,
  question,
  sendChatMessage,
} from "../test-database/chat-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";
import { twoUsers } from "../test-database/two-users-test-kit.ts";

// How many requests start one conversation at once in the races below.
const AT_ONCE = 4;

// What a new Dailies starts with, as its premade quest gives it.
function dailiesStart(): Parameters<typeof startDailies>[1] {
  return {
    name: QUEST_NAME.parse("Dailies"),
    context: "## Goal\n\nStart each day with one manageable step.",
    construct: getConstruct("vellum"),
  };
}

// The user's Dailies quests.
async function dailiesOf(user: User): Promise<string[]> {
  return (await listQuests(user.id))
    .filter(({ dailies }) => dailies)
    .map(({ id }) => id);
}

describe("a quest's conversation", () => {
  test("reading a quest without one starts none and spends nothing", async () => {
    const user = await testUser();
    const quest = await testData(user).quest();

    expect(await readQuestConversation(user.id, quest.id)).toBeUndefined();
    expect(await readQuestConversation(user.id, quest.id)).toBeUndefined();
    expect(await goldSpent(user)).toBe(0);
  });

  test("concurrent starts reach one conversation with one opening", async () => {
    const user = await testUser();
    const quest = await testData(user).quest();

    const results = await Promise.all(
      Array.from({ length: AT_ONCE }, () =>
        startQuestConversation(user.id, quest.id),
      ),
    );

    const ids = new Set(
      results.map((result) => {
        if (result.kind !== "started") {
          throw new Error(`A start was refused: ${result.kind}`);
        }
        return result.conversation.id;
      }),
    );
    expect(ids.size).toBe(1);
    const [id] = ids;
    if (id === undefined) {
      throw new Error("No conversation");
    }
    const opened = await listMessages(user.id, id);
    expect(opened.map(({ role }) => role)).toEqual(["assistant"]);
    expect((await readQuestConversation(user.id, quest.id))?.id).toBe(id);
  });

  test("a new quest opens in its one conversation, which every later start continues", async () => {
    const user = await testUser();
    const started = await startQuest(
      user.id,
      QUEST_NAME.parse("Sea turtle"),
      getConstruct("lumen"),
    );
    if (started.kind !== "started") {
      throw new Error(`The quest didn't start: ${started.kind}`);
    }
    const { chat } = started;

    const again = await startQuestConversation(user.id, chat.quest.id);

    expect(again).toMatchObject({
      kind: "started",
      conversation: { id: chat.id, construct: { name: "Lumen" } },
    });
    expect(await listMessages(user.id, chat.id)).toHaveLength(1);
  });

  test("another user's quest is not found, and nothing is started in it", async () => {
    const { her, herData, other } = await twoUsers();
    const quest = await herData.quest();

    expect(await startQuestConversation(other.id, quest.id)).toEqual({
      kind: "notFound",
    });
    expect(await readQuestConversation(her.id, quest.id)).toBeUndefined();
  });

  test("a former member can't send to, open or resolve the owner's conversation", async () => {
    const [owner, member] = await Promise.all([testUser(), testUser()]);
    const data = testData(owner);
    const quest = await data.quest();
    const chat = await data.chat(quest);
    const before = await listMessages(owner.id, chat.id);

    await signIn(member);
    const sent = await sendChatMessage(chat.id, "Hello from the member");

    expect(sent.status).toBe(HTTP_STATUS.notFound);
    expect(await listMessages(owner.id, chat.id)).toEqual(before);
    expect(await goldSpent(member)).toBe(0);
    expect(await readQuestConversation(member.id, quest.id)).toBeUndefined();
    expect(await getChat(member.id, chat.id)).toBeUndefined();
    expect(await resolveConversation(member.id, chat.id)).toBeUndefined();
    expect(await resolveConversation(owner.id, chat.id)).toEqual({
      kind: "quest",
      questId: quest.id,
    });
  });
});

describe("a quest's Progress", () => {
  test("a milestone stays on the timeline, with no conversation, once its conversation is gone", async () => {
    const user = await testUser();
    const data = testData(user);
    const quest = await data.quest();
    const chat = await data.chat(quest);
    await recordMilestone(
      user.id,
      { questId: quest.id, chatId: chat.id },
      "Modelled the shell",
    );

    await getDb().delete(chats).where(eq(chats.id, chat.id));

    expect(await listMilestones(user.id, quest.id)).toMatchObject([
      { text: "Modelled the shell", chatId: undefined },
    ]);
  });
});

describe("a long conversation", () => {
  test("a reply reads only the newest messages, while the conversation keeps them all", async () => {
    const user = await testUser();
    const data = testData(user);
    const chat = await data.chat(await data.quest());
    const reply: Exchange["reply"] = [{ type: "text", text: "Ok" }];
    const exchanges: Exchange[] = [
      { message: "The first thing: oldkeyword", reply },
      ...Array.from({ length: CONVERSATION_WINDOW }, () => ({
        message: "Carry on",
        reply,
      })),
      { message: "The latest thing: newkeyword", reply },
    ];
    await data.exchanges(chat, exchanges);
    await signIn(user);

    const answer = await conversationToAnswer(user.id, chat, question("help"));
    expect(answer.kind).toBe("reply");
    if (answer.kind !== "reply") {
      throw new Error("Reply refused");
    }
    const history = answer.conversation.map(messageText).join("\n");
    expect(history).not.toContain("oldkeyword");
    expect(history).toContain("newkeyword");
    expect(messageText((await listMessages(user.id, chat.id))[0])).toContain(
      "oldkeyword",
    );
  });
});

describe("the private Chat", () => {
  test("its user returns to the same conversation, which no one else can reach", async () => {
    const { her, other } = await twoUsers();

    const [first, second] = await Promise.all([
      privateChat(her.id),
      privateChat(her.id),
    ]);
    const later = await privateChat(her.id);
    const theirs = await privateChat(other.id);

    expect(second.id).toBe(first.id);
    expect(later.id).toBe(first.id);
    expect(first.quest).toBeUndefined();
    expect(await listMessages(her.id, first.id)).toEqual([]);
    expect(await goldSpent(her)).toBe(0);
    expect(theirs.id).not.toBe(first.id);
    expect(await getChat(other.id, first.id)).toBeUndefined();
    expect(await resolveConversation(other.id, first.id)).toBeUndefined();
    expect(await resolveConversation(her.id, first.id)).toEqual({
      kind: "chat",
    });
  });
});

describe("Dailies", () => {
  test("concurrent starts make one Dailies quest, and each start after resumes it", async () => {
    const user = await testUser();

    const results = await Promise.all(
      Array.from({ length: AT_ONCE }, () =>
        startDailies(user.id, dailiesStart()),
      ),
    );

    const quests = await dailiesOf(user);
    expect(quests).toHaveLength(1);
    expect(
      results.map((result) => {
        if (result.kind !== "started" && result.kind !== "resumed") {
          throw new Error(`Dailies didn't start: ${result.kind}`);
        }
        return result.chat.quest.id;
      }),
    ).toEqual(Array.from({ length: AT_ONCE }, () => quests[0]));
    expect(results.filter(({ kind }) => kind === "started")).toHaveLength(1);
  });

  test("resuming keeps its conversation and name without spending batteries", async () => {
    const user = await testUser();
    const first = await startDailies(user.id, dailiesStart());
    if (first.kind !== "started") {
      throw new Error("Dailies did not start");
    }
    const { chat } = first;
    await signIn(user);
    await sendChatMessage(chat.id, "Let's start the day.");
    const before = await listMessages(user.id, chat.id);
    const balance = await goldSpent(user);
    await renameQuest(user.id, chat.quest.id, QUEST_NAME.parse("My mornings"));
    const resumed = await startDailies(user.id, dailiesStart());
    if (resumed.kind !== "resumed") {
      throw new Error("Dailies did not resume");
    }
    expect(resumed.chat.id).toBe(chat.id);
    expect(resumed.chat.quest.name).toBe("My mornings");
    expect(await listMessages(user.id, chat.id)).toEqual(before);
    expect(await goldSpent(user)).toBe(balance);
  });

  test("each user has their own Dailies, and a former member's start makes theirs", async () => {
    const { her, other } = await twoUsers();
    const hers = await startDailies(her.id, dailiesStart());
    if (hers.kind !== "started") {
      throw new Error(`Dailies didn't start: ${hers.kind}`);
    }

    const theirs = await startDailies(other.id, dailiesStart());

    expect(theirs.kind).toBe("started");
    expect(await dailiesOf(other)).toHaveLength(1);
    expect(await dailiesOf(other)).not.toContain(hers.chat.quest.id);
    expect(await dailiesOf(her)).toEqual([hers.chat.quest.id]);
  });
});
