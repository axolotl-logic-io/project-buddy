import { and, eq } from "drizzle-orm";
import { describe, expect, test } from "vitest";
import { questOwnedBy } from "@/accounts/owner-scope.ts";
import { getDb } from "@/db/client.ts";
import { quests } from "@/db/tables/quests.ts";
import type { QuestId, UserId } from "@/ids.ts";
import {
  CONJURATION,
  conjure,
  startPerformance,
} from "@/performances/performance-store.ts";
import { readCurrentQuest } from "@/quests/current-quest-store.ts";
import { changeQuestStatus } from "@/quests/quest-status-store.ts";
import {
  changeMurmling,
  listMurmlings,
  readNextMurmling,
} from "@/spaces/murmling-store.ts";
import { listSpaces } from "@/spaces/space-store.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";

const STARTED_AT = [
  new Date("2026-01-01T00:00:00Z"),
  new Date("2026-01-02T00:00:00Z"),
] as const;

async function setStartedAt(
  owner: UserId,
  id: QuestId,
  createdAt: Date,
): Promise<void> {
  await getDb()
    .update(quests)
    .set({ createdAt })
    .where(and(eq(quests.id, id), questOwnedBy(owner)));
}

describe("use_case_continue_quest", () => {
  test("a new user has nothing to continue", async () => {
    const fresh = await testUser();
    expect(await readCurrentQuest(fresh.id)).toBeUndefined();
  });

  test("uses the newest conjuration, or the newest quest when nobody has conjured", async () => {
    const [user, other] = await Promise.all([testUser(), testUser()]);
    const data = testData(user);
    const [turtle, garden] = await Promise.all([
      data.quest("Sea turtle model"),
      data.quest("Garden planner"),
    ]);
    await Promise.all([
      setStartedAt(user.id, turtle.id, STARTED_AT[0]),
      setStartedAt(user.id, garden.id, STARTED_AT[1]),
      testData(other).quest("Private quest"),
    ]);
    expect((await readCurrentQuest(user.id))?.quest.id).toBe(garden.id);
    const [space] = await listSpaces(user.id, turtle.id);
    if (space === undefined) {
      throw new Error("The quest has no starting space");
    }
    const performance = await startPerformance(user.id, turtle.id, {
      spaceId: space.id,
      riteId: "capture",
    });
    if (performance === undefined) {
      throw new Error("The performance did not start");
    }
    await conjure(
      user.id,
      turtle.id,
      CONJURATION.parse({
        id: crypto.randomUUID(),
        performanceId: performance.id,
        text: "Retopologize the flipper",
      }),
    );
    expect(await readCurrentQuest(user.id)).toMatchObject({
      quest: { id: turtle.id, name: "Sea turtle model" },
      nextTask: "Retopologize the flipper",
    });
    await changeQuestStatus(user.id, {
      questId: turtle.id,
      fromStatus: "active",
      toStatus: "completed",
      revision: 0,
    });
    expect((await readCurrentQuest(user.id))?.quest.id).toBe(garden.id);
    await changeQuestStatus(user.id, {
      questId: garden.id,
      fromStatus: "active",
      toStatus: "abandoned",
      revision: 0,
    });
    expect(await readCurrentQuest(user.id)).toBeUndefined();
  });
});

test("use_case_ask_whats_next", async () => {
  const user = await testUser();
  const quest = await testData(user).quest();
  const [first, second] = await listSpaces(user.id, quest.id);
  if (first === undefined || second === undefined) {
    throw new Error("The quest has no starting spaces");
  }
  await changeMurmling(user.id, quest.id, second.id, {
    kind: "add",
    type: "task",
    text: "In a later space",
  });
  await changeMurmling(user.id, quest.id, first.id, {
    kind: "add",
    type: "plain",
    text: "A possibility",
  });
  await changeMurmling(user.id, quest.id, first.id, {
    kind: "add",
    text: "In the first space",
  });
  const firstTask = (await listMurmlings(user.id, quest.id, first.id)).find(
    ({ type }) => type === "task",
  );
  if (firstTask === undefined) {
    throw new Error("The task was not saved");
  }
  expect((await readCurrentQuest(user.id))?.nextTask).toBe(firstTask.text);
  await changeMurmling(user.id, quest.id, first.id, {
    kind: "check",
    id: firstTask.id,
    checkedOff: true,
  });
  expect((await readNextMurmling(user.id, quest.id))?.text).toBe(
    "In a later space",
  );
});
