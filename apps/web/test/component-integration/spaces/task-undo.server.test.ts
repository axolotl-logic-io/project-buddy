import { expect, test } from "vitest";
import { readExperience } from "@/experience/experience-store.ts";
import { changeMurmling, writeSpaceContents } from "@/spaces/murmling-store.ts";
import { listSpaces } from "@/spaces/space-store.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { addInvitee, addMember, addRemovedMember } from "../quests/quest-members-test-kit.ts";

test("use_case_change_tasks", async () => {
  const [owner, member, pending, removed] = await Promise.all([testUser(), testUser(), testUser(), testUser()]);
  const quest = await testData(owner).quest();
  await addInvitee(owner, quest.id, pending);
  await addMember(owner, quest.id, member);
  await addRemovedMember(owner, quest.id, removed);
  const [space] = await listSpaces(owner.id, quest.id);
  if (space === undefined) {
    throw new Error("Missing space");
  }
  const added = await writeSpaceContents(owner.id, quest.id, space.id, { kind: "add", text: "Buy flour" });
  const task = added.space?.murmlings[0];
  if (task === undefined) {
    throw new Error("Missing task");
  }
  const checked = await writeSpaceContents(member.id, quest.id, space.id, { kind: "check", id: task.id, checkedOff: true });
  const version = checked.space?.version;
  if (version === undefined) {
    throw new Error("Missing change version");
  }
  const edit = { kind: "edit", id: task.id, text: "Buy rye flour" } as const;
  expect(await changeMurmling(pending.id, quest.id, space.id, edit)).toBe("missing");
  expect(await changeMurmling(removed.id, quest.id, space.id, edit)).toBe("missing");
  await changeMurmling(owner.id, quest.id, space.id, edit);
  const undone = await writeSpaceContents(owner.id, quest.id, space.id, { kind: "undo", version });
  expect(undone.space?.murmlings).toMatchObject([{ id: task.id, text: edit.text, checkedOff: false }]);
  expect((await readExperience(member.id)).counts["checking-off"]).toBe(0);
  expect(await changeMurmling(owner.id, quest.id, space.id, { kind: "undo", version })).toBe("unchanged");
});
