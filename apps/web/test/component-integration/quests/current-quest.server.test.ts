// What Quests reads to offer Continue, against the test database
// ("use_case_continue_quest"): the user's own Active quest whose
// conversation was most recently active, with its next step. How the next
// step is chosen between the plan and the Journal is
// plan/plan.server.test.ts's.

import { and, eq } from "drizzle-orm";
import { describe, expect, test } from "vitest";
import { chatOpenTo } from "@/accounts/owner-scope.ts";
import { privateChat } from "@/conversations/private-chat.ts";
import { getDb } from "@/db/client.ts";
import { chats } from "@/db/tables/quests-and-chats.ts";
import type { ChatId, UserId } from "@/ids.ts";
import { changePlan } from "@/plan/plan-store.ts";
import { readCurrentQuest } from "@/quests/current-quest-store.ts";
import { changeQuestStatus } from "@/quests/quest-status-store.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";

// Explicit start times, oldest first, decide the order of conversations
// with no messages; a message saved now is newer than any of them.
const STARTED_AT = [
  new Date("2026-01-01T00:00:00Z"),
  new Date("2026-01-02T00:00:00Z"),
  new Date("2026-01-03T00:00:00Z"),
] as const;

const HELLO = [
  { message: "Hello", reply: [{ type: "text", text: "Hi!" }] },
] as const;

async function setStartedAt(
  owner: UserId,
  id: ChatId,
  createdAt: Date,
): Promise<void> {
  await getDb()
    .update(chats)
    .set({ createdAt })
    .where(and(eq(chats.id, id), chatOpenTo(owner)));
}

describe("use_case_continue_quest", () => {
  test("a new user, or one with only Chat, has nothing to continue", async () => {
    const [fresh, chatter] = await Promise.all([testUser(), testUser()]);
    await privateChat(chatter.id);

    const [none, chatOnly] = await Promise.all([
      readCurrentQuest(fresh.id),
      readCurrentQuest(chatter.id),
    ]);

    expect(none).toBeUndefined();
    expect(chatOnly).toBeUndefined();
  });

  test("continues the quest whose conversation was most recently active, with its next step", async () => {
    const [user, other] = await Promise.all([testUser(), testUser()]);
    const data = testData(user);
    const [turtle, garden, idle] = await Promise.all([
      data.quest("Sea turtle model"),
      data.quest("Garden planner"),
      data.quest("Idle project"),
    ]);
    const [turtleChat, gardenChat, idleChat] = await Promise.all([
      data.chat(turtle),
      data.chat(garden),
      data.chat(idle),
    ]);
    // Another user's newer conversation is never theirs to continue.
    const otherData = testData(other);
    await otherData.chat(await otherData.quest("Private project"));
    await Promise.all([
      setStartedAt(user.id, idleChat.id, STARTED_AT[0]),
      setStartedAt(user.id, turtleChat.id, STARTED_AT[1]),
      setStartedAt(user.id, gardenChat.id, STARTED_AT[2]),
      changePlan(user.id, { questId: turtle.id, author: "person" }, [
        { op: "add", text: "retopo the flipper" },
      ]),
    ]);
    expect(await readCurrentQuest(user.id)).toEqual({
      quest: { id: garden.id, name: "Garden planner" },
      nextStep: undefined,
    });

    // A message makes the turtle's conversation the most recently active.
    await data.exchanges(turtleChat, HELLO);

    expect(await readCurrentQuest(user.id)).toEqual({
      quest: { id: turtle.id, name: "Sea turtle model" },
      nextStep: "retopo the flipper",
    });
  });

  test("continues only an Active quest, and none once every quest is finished", async () => {
    const user = await testUser();
    const data = testData(user);
    const [finished, active] = await Promise.all([
      data.quest("Finished"),
      data.quest("Still going"),
    ]);
    const [finishedChat, activeChat] = await Promise.all([
      data.chat(finished),
      data.chat(active),
    ]);
    await setStartedAt(user.id, activeChat.id, STARTED_AT[0]);
    await data.exchanges(finishedChat, HELLO);
    await changeQuestStatus(user.id, {
      questId: finished.id,
      fromStatus: "active",
      toStatus: "completed",
      revision: 0,
    });

    expect((await readCurrentQuest(user.id))?.quest.id).toBe(active.id);

    await changeQuestStatus(user.id, {
      questId: active.id,
      fromStatus: "active",
      toStatus: "abandoned",
      revision: 0,
    });

    expect(await readCurrentQuest(user.id)).toBeUndefined();
  });
});
