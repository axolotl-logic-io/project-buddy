import { expect, test } from "vitest";
import { readExperience } from "@/experience/experience-store.ts";
import { changeQuestStatus } from "@/quests/quest-status-store.ts";
import { writeSpaceContents } from "@/spaces/murmling-store.ts";
import { listSpaces } from "@/spaces/space-store.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { addMember } from "../quests/quest-members-test-kit.ts";

test("use_case_experience", async () => {
  const [owner, member] = await Promise.all([testUser(), testUser()]);
  const quest = await testData(owner).quest();
  await addMember(owner, quest.id, member);
  const [space] = await listSpaces(member.id, quest.id);
  if (space === undefined) {
    throw new Error("Missing space");
  }
  const added = await writeSpaceContents(member.id, quest.id, space.id, { kind: "add", text: "Pack lunch" });
  const task = added.space?.murmlings[0];
  if (task === undefined) {
    throw new Error("Missing task");
  }
  await writeSpaceContents(owner.id, quest.id, space.id, { kind: "check", id: task.id, checkedOff: true });
  await changeQuestStatus(member.id, { questId: quest.id, fromStatus: "active", toStatus: "completed", revision: 0 });
  expect((await readExperience(member.id)).counts).toMatchObject({ adding: 1, "completing-quests": 1 });
  expect((await readExperience(owner.id)).counts["checking-off"]).toBe(1);
  await writeSpaceContents(member.id, quest.id, space.id, { kind: "check", id: task.id, checkedOff: false });
  await changeQuestStatus(owner.id, { questId: quest.id, fromStatus: "completed", toStatus: "active", revision: 1 });
  expect((await readExperience(member.id)).experience).toBe(1);
  expect((await readExperience(owner.id)).experience).toBe(0);
});
