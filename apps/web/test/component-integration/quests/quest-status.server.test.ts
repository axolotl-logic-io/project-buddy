import { expect, test, vi } from "vitest";
import { changeQuestStatusAction } from "@/app/(workspace)/quests/status-actions.ts";
import { readExperience } from "@/experience/experience-store.ts";
import { changeQuestStatus } from "@/quests/quest-status-store.ts";
import { getQuest } from "@/quests/store.ts";
import { listSpaces } from "@/spaces/space-store.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { formOf } from "../test-database/form-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";
import { addMember } from "./quest-members-test-kit.ts";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));

test("use_case_change_quest_status", async () => {
  const [owner, member, outsider] = await Promise.all([
    testUser(),
    testUser(),
    testUser(),
  ]);
  const quest = await testData(owner).quest();
  const before = await listSpaces(owner.id, quest.id);
  await addMember(owner, quest.id, member);
  await signIn(member);
  const finished = await changeQuestStatusAction(
    { kind: "idle" },
    formOf({
      questId: quest.id,
      fromStatus: "active",
      toStatus: "completed",
      revision: "0",
    }),
  );
  expect(finished).toMatchObject({ kind: "saved", change: { revision: 1 } });
  expect((await getQuest(owner.id, quest.id))?.status).toBe("completed");
  expect(await listSpaces(member.id, quest.id)).toEqual(before);
  expect(await getQuest(outsider.id, quest.id)).toBeUndefined();
  expect(
    await changeQuestStatus(member.id, {
      questId: quest.id,
      fromStatus: "completed",
      toStatus: "active",
      revision: 0,
    }),
  ).toBeUndefined();
});

test("use_case_restore_quest", async () => {
  const owner = await testUser();
  const quest = await testData(owner).quest();
  const before = await listSpaces(owner.id, quest.id);
  await changeQuestStatus(owner.id, {
    questId: quest.id,
    fromStatus: "active",
    toStatus: "completed",
    revision: 0,
  });
  expect((await readExperience(owner.id)).counts["completing-quests"]).toBe(1);
  await signIn(owner);
  expect(
    await changeQuestStatusAction(
      { kind: "idle" },
      formOf({
        questId: quest.id,
        fromStatus: "completed",
        toStatus: "active",
        revision: "1",
      }),
    ),
  ).toMatchObject({ kind: "saved", change: { revision: 2 } });
  expect(await listSpaces(owner.id, quest.id)).toEqual(before);
  expect((await readExperience(owner.id)).counts["completing-quests"]).toBe(0);
});
