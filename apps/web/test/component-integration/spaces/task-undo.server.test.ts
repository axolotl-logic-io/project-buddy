import { expect, test } from "vitest";
import { readExperience } from "@/experience/experience-store.ts";
import {
  changeMurmling,
  listMurmlings,
  writeSpaceContents,
} from "@/spaces/murmling-store.ts";
import { listSpaces } from "@/spaces/space-store.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import {
  addInvitee,
  addMember,
  addRemovedMember,
} from "../quests/quest-members-test-kit.ts";

test("use_case_change_tasks", async () => {
  const [owner, member, pending, removed] = await Promise.all([
    testUser(),
    testUser(),
    testUser(),
    testUser(),
  ]);
  const quest = await testData(owner).quest();
  await addInvitee(owner, quest.id, pending);
  await addMember(owner, quest.id, member);
  await addRemovedMember(owner, quest.id, removed);
  const [space] = await listSpaces(owner.id, quest.id);
  if (space === undefined) {
    throw new Error("Missing space");
  }
  const added = await writeSpaceContents(owner.id, quest.id, space.id, {
    kind: "add",
    text: "Buy flour",
  });
  const task = added.space?.murmlings[0];
  if (task === undefined) {
    throw new Error("Missing task");
  }
  const checked = await writeSpaceContents(member.id, quest.id, space.id, {
    kind: "check",
    id: task.id,
    checkedOff: true,
  });
  const version = checked.space?.version;
  if (version === undefined) {
    throw new Error("Missing change version");
  }
  const edit = { kind: "edit", id: task.id, text: "Buy rye flour" } as const;
  expect(await changeMurmling(pending.id, quest.id, space.id, edit)).toBe(
    "missing",
  );
  expect(await changeMurmling(removed.id, quest.id, space.id, edit)).toBe(
    "missing",
  );
  await changeMurmling(owner.id, quest.id, space.id, edit);
  const undone = await writeSpaceContents(owner.id, quest.id, space.id, {
    kind: "undo",
    version,
  });
  expect(undone.space?.murmlings).toMatchObject([
    { id: task.id, text: edit.text, checkedOff: false },
  ]);
  expect((await readExperience(member.id)).counts["checking-off"]).toBe(0);
  expect(
    await changeMurmling(owner.id, quest.id, space.id, {
      kind: "undo",
      version,
    }),
  ).toBe("unchanged");
});

test("use_case_change_tasks: Undo keeps the changes made since", async () => {
  const owner = await testUser();
  const quest = await testData(owner).quest();
  const [space] = await listSpaces(owner.id, quest.id);
  if (space === undefined) {
    throw new Error("Missing space");
  }
  function change(
    body: Parameters<typeof writeSpaceContents>[3],
  ): ReturnType<typeof writeSpaceContents> {
    return writeSpaceContents(owner.id, quest.id, space.id, body);
  }
  await change({ kind: "add", text: "Mix" });
  await change({ kind: "add", text: "Proof" });
  await change({ kind: "add", text: "Bake" });
  const [mix, proof, bake] = await listMurmlings(owner.id, quest.id, space.id);
  if (mix === undefined || proof === undefined || bake === undefined) {
    throw new Error("Missing tasks");
  }

  const removed = (await change({ kind: "remove", id: proof.id })).space
    ?.version;
  const edited = (await change({ kind: "edit", id: mix.id, text: "Knead" }))
    .space?.version;
  if (removed === undefined || edited === undefined) {
    throw new Error("Missing change version");
  }
  await change({ kind: "remove", id: bake.id });
  await change({ kind: "remove", id: mix.id });

  // Proof's old neighbour, Bake, is gone, so Proof goes back at the end.
  const restored = await change({ kind: "undo", version: removed });
  expect(restored.space?.murmlings).toMatchObject([
    { id: proof.id, text: "Proof", taskNumber: proof.taskNumber },
  ]);
  // Mix was removed after its edit, so undoing the edit leaves it removed.
  expect(
    await changeMurmling(owner.id, quest.id, space.id, {
      kind: "undo",
      version: edited,
    }),
  ).toBe("unchanged");
});
