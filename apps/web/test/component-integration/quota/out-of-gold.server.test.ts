// "use_case_out_of_gold" in use-cases/: the user's gold spent. She starts
// with exactly 1 gold, so the mock construct's first reply, charged at Sonnet's
// prices like Claude's, takes her under 1 whole gold, which the account
// page shows as 0. The chat's text going back into the box is the chat view's to show
// (chat-images.browser.test.tsx).

import { describe, expect, test } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import { listMessages } from "@/chats/store.ts";
import { getConstruct } from "@/constructs/index.ts";
import { startQuest } from "@/conversations/start-quest.ts";
import { userMessage } from "@/errors/app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { QUEST_NAME } from "@/quests/quest-name.ts";
import { listQuests, type Quest } from "@/quests/store.ts";
import { LOCAL_CONSTRUCT_COPY } from "@/ui/copy/local-construct.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import {
  spendAllGold,
  spendGold,
} from "../../support/test-database/gold-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import {
  messageText,
  type SentMessage,
  sendChatMessage,
} from "../test-database/chat-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

// Her first message in each test's chat.
const FIRST_MESSAGE = "Bevel a donut";
const SECOND_MESSAGE = "Now add sprinkles";
// The starting 100 gold, in micro-USD, less 1 gold.
const ALL_BUT_ONE_GOLD = 990_000;
const OUT_OF_GOLD: string = userMessage("out-of-gold");

// A chat of user's in a new quest, with them signed in.
interface GoldScene {
  readonly user: User;
  readonly quest: Quest;
  readonly chat: Chat;
}

// A scene whose user has spent their gold as spending does.
async function sceneAfter(
  spending: (user: User) => Promise<void>,
): Promise<GoldScene> {
  const user = await testUser();
  const data = testData(user);
  const quest = await data.quest();
  const chat = await data.chat(quest, "lumen");
  await spending(user);
  await signIn(user);
  return { user, quest, chat };
}

// Spends all but 1 of user's gold.
function spendAllButOne(user: User): Promise<void> {
  return spendGold(user, ALL_BUT_ONE_GOLD);
}

// What a refused message's answer says: its status, and the message the
// chat shows for its case, or the body itself if it isn't a known case.
function refusal({
  status,
  body,
}: SentMessage): Pick<SentMessage, "status" | "body"> {
  if (body === "out-of-gold") {
    return { status, body: OUT_OF_GOLD };
  }
  return { status, body };
}

// What sending her first message, which spends the last of her gold, did: the answer's
// status, the roles of the chat's messages and the reply's text.
interface CrossingReply {
  readonly status: number;
  readonly roles: readonly string[];
  readonly reply: string;
}

// Sends her first message, which spends the last of her gold, and says
// what it did.
async function sendCrossingMessage({
  user,
  chat,
}: GoldScene): Promise<CrossingReply> {
  const { status } = await sendChatMessage(chat.id, FIRST_MESSAGE);
  const saved = await listMessages(user.id, chat.id);
  const [reply = ""] = saved
    .filter(({ role }) => role === "assistant")
    .map(messageText);
  return { status, roles: saved.map(({ role }) => role), reply };
}

// What starting a new quest answered once the scene user is out of
// batteries, and their quests after.
interface StartAttempts {
  readonly newQuest: string;
  readonly questIds: readonly string[];
}

async function tryToStart({ user }: GoldScene): Promise<StartAttempts> {
  const started = await startQuest(
    user.id,
    QUEST_NAME.parse("Fox"),
    getConstruct("lumen"),
  );
  return {
    newQuest: started.kind,
    questIds: (await listQuests(user.id)).map(({ id }) => id),
  };
}

test("use_case_out_of_gold", async () => {
  const scene = await sceneAfter(spendAllButOne);
  const { user, chat, quest } = scene;

  const crossing = await sendCrossingMessage(scene);
  expect(crossing.status).toBe(HTTP_STATUS.ok);
  expect(crossing.roles).toStrictEqual(["user", "assistant"]);
  expect(crossing.reply).toBe(LOCAL_CONSTRUCT_COPY.unknownCommand);
  await spendAllGold(user);

  const afterFirst = await listMessages(user.id, chat.id);
  const next = refusal(await sendChatMessage(chat.id, SECOND_MESSAGE));
  expect(next.status).toBe(HTTP_STATUS.tooManyRequests);
  expect(next.body).toBe(OUT_OF_GOLD);
  expect(await listMessages(user.id, chat.id)).toStrictEqual(afterFirst);

  const attempts = await tryToStart(scene);
  expect(attempts.newQuest).toBe("outOfGold");
  expect(attempts.questIds).toStrictEqual([quest.id]);
});

describe("use_case_out_of_gold", () => {
  test("an empty chat's refused first message leaves it empty, with no reply", async () => {
    const { user, chat } = await sceneAfter(spendAllGold);

    const refused = refusal(await sendChatMessage(chat.id, FIRST_MESSAGE));

    expect(refused.status).toBe(HTTP_STATUS.tooManyRequests);
    expect(refused.body).toBe(OUT_OF_GOLD);
    expect(await listMessages(user.id, chat.id)).toStrictEqual([]);
  });
});
