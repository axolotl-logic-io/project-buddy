// A Construct's start action begins a quest through the one quest start
// with the construct preset, against the test database with the mock
// construct. An own construct stands for every construct: the cards only
// preset the start.

import { describe, expect, test } from "vitest";
import { startQuestAction } from "@/app/(workspace)/quests/actions.ts";
import { readQuestConversation } from "@/conversations/start-quest.ts";
import type { UserId } from "@/ids.ts";
import { listQuests, type Quest } from "@/quests/store.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { formOf } from "../test-database/chat-test-kit.ts";
import { expectRedirect } from "../test-database/navigation-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

const QUEST_NAME = "A small experiment";

// Starts a quest with the details the start's form sends, and returns the
// quest named QUEST_NAME, having checked the start opened it.
async function startedQuest(
  owner: UserId,
  details: Readonly<Record<string, string>>,
): Promise<Quest> {
  const starting = startQuestAction(
    { kind: "idle" },
    formOf({ name: QUEST_NAME, context: "", ...details }),
  );
  await Promise.allSettled([starting]);
  const quest = (await listQuests(owner)).find(
    ({ name }) => name === QUEST_NAME,
  );
  if (quest === undefined) {
    throw new Error("No quest started");
  }
  await expectRedirect(() => starting, `/quests/${quest.id}`);
  return quest;
}

describe("a construct's start action", () => {
  test("starting with her own construct opens a quest that speaks with it", async () => {
    const user = await testUser();
    const own = await testData(user).editedConstruct();
    await signIn(user);

    const quest = await startedQuest(user.id, {
      premadeId: "do",
      constructId: own.id,
    });

    const conversation = await readQuestConversation(user.id, quest.id);
    expect(conversation?.construct.name).toBe(own.name);
    expect(conversation?.activity.id).toBe("project-breakdown");
  });
});
