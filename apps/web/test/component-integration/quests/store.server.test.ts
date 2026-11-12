// The quest store against the test database: her quest is found by
// its id in any case, and another user's reads as not found.

import { describe, expect, test } from "vitest";
import { getQuest } from "@/quests/store.ts";
import { twoUsers } from "../test-database/two-users-test-kit.ts";

describe("the project store, in the test database", () => {
  test("her project is found by its id in capitals", async () => {
    const { her, herData } = await twoUsers();
    const quest = await herData.quest("Low-poly fox");

    expect(await getQuest(her.id, quest.id.toUpperCase())).toEqual(quest);
  });

  test("another user's project reads as not found", async () => {
    const { her, otherData } = await twoUsers();
    const theirs = await otherData.quest("Low-poly fox");

    expect(await getQuest(her.id, theirs.id)).toBeUndefined();
  });
});
