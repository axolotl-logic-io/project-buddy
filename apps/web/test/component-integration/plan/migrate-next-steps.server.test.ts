import { describe, expect, test } from "vitest";
import { MEMORY_VERSION_NUMBER } from "@/memory/memory.ts";
import {
  readMemory,
  readMemoryHistory,
  saveMemory,
} from "@/memory/memory-store.ts";
import { migrateNextSteps } from "@/memory/migrate-next-steps.ts";
import { changePlan, readPlanState } from "@/plan/plan-store.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";

describe("legacy Journal migration", () => {
  test("previews, moves atomically, and leaves a repeat unchanged", async () => {
    const owner = await testUser();
    const quest = await testData(owner).project();
    await saveMemory(owner.id, {
      projectId: quest.id,
      basedOn: MEMORY_VERSION_NUMBER.parse(0),
      author: "user",
      text: "Next step: Practice\nNotes",
    });
    await migrateNextSteps(true);
    expect((await readPlanState(owner.id, quest.id))?.version).toBe(0);
    await migrateNextSteps(false);
    expect((await readPlanState(owner.id, quest.id))?.plan.steps).toEqual([
      { number: 1, text: "Practice", done: false },
    ]);
    expect((await readMemory(owner.id, quest.id)).text).toBe("Notes");
    await migrateNextSteps(false);
    expect(
      (await readMemoryHistory(owner.id, quest.id)).map(({ author }) => author),
    ).toEqual(["construct", "user"]);
    expect((await readPlanState(owner.id, quest.id))?.version).toBe(1);
  });
  test("preserves an existing plan and its Journal", async () => {
    const owner = await testUser();
    const quest = await testData(owner).project();
    await saveMemory(owner.id, {
      projectId: quest.id,
      basedOn: MEMORY_VERSION_NUMBER.parse(0),
      author: "user",
      text: "Next step: Old",
    });
    await changePlan(owner.id, { projectId: quest.id, author: "person" }, [
      { op: "add", text: "New" },
    ]);
    await migrateNextSteps(false);
    expect((await readMemory(owner.id, quest.id)).text).toBe("Next step: Old");
    expect((await readPlanState(owner.id, quest.id))?.version).toBe(1);
  });
});
