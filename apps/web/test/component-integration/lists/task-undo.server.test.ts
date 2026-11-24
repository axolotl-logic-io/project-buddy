import { expect, test } from "vitest";
import { readExperience } from "@/experience/experience-store.ts";
import {
  changeListItem,
  readListItems,
  writeListContents,
} from "@/lists/list-item-store.ts";
import { readLists } from "@/lists/list-store.ts";
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
  const [list] = await readLists(owner.id, quest.id);
  if (list === undefined) {
    throw new Error("Missing list");
  }
  const added = await writeListContents(owner.id, quest.id, list.id, {
    kind: "add",
    text: "Buy flour",
  });
  const task = added.list?.listItems[0];
  if (task === undefined) {
    throw new Error("Missing task");
  }
  const checked = await writeListContents(member.id, quest.id, list.id, {
    kind: "check",
    id: task.id,
    checkedOff: true,
  });
  const version = checked.list?.version;
  if (version === undefined) {
    throw new Error("Missing change version");
  }
  const edit = { kind: "edit", id: task.id, text: "Buy rye flour" } as const;
  expect(await changeListItem(pending.id, quest.id, list.id, edit)).toBe(
    "missing",
  );
  expect(await changeListItem(removed.id, quest.id, list.id, edit)).toBe(
    "missing",
  );
  await changeListItem(owner.id, quest.id, list.id, edit);
  const undone = await writeListContents(owner.id, quest.id, list.id, {
    kind: "undo",
    version,
  });
  expect(undone.list?.listItems).toMatchObject([
    { id: task.id, text: edit.text, checkedOff: false },
  ]);
  expect((await readExperience(member.id)).counts["checking-off"]).toBe(0);
  expect(
    await changeListItem(owner.id, quest.id, list.id, {
      kind: "undo",
      version,
    }),
  ).toBe("unchanged");
});

test("use_case_change_tasks: Undo keeps the changes made since", async () => {
  const owner = await testUser();
  const quest = await testData(owner).quest();
  const [list] = await readLists(owner.id, quest.id);
  if (list === undefined) {
    throw new Error("Missing list");
  }
  const listId = list.id;
  function change(
    body: Parameters<typeof writeListContents>[3],
  ): ReturnType<typeof writeListContents> {
    return writeListContents(owner.id, quest.id, listId, body);
  }
  await change({ kind: "add", text: "Mix" });
  await change({ kind: "add", text: "Proof" });
  await change({ kind: "add", text: "Bake" });
  const [mix, proof, bake] = await readListItems(owner.id, quest.id, list.id);
  if (mix === undefined || proof === undefined || bake === undefined) {
    throw new Error("Missing tasks");
  }

  const removed = (await change({ kind: "remove", id: proof.id })).list
    ?.version;
  const edited = (await change({ kind: "edit", id: mix.id, text: "Knead" }))
    .list?.version;
  if (removed === undefined || edited === undefined) {
    throw new Error("Missing change version");
  }
  await change({ kind: "remove", id: bake.id });
  await change({ kind: "remove", id: mix.id });

  // Proof's old neighbour, Bake, is gone, so Proof goes back at the end.
  const restored = await change({ kind: "undo", version: removed });
  expect(restored.list?.listItems).toMatchObject([
    { id: proof.id, text: "Proof", taskNumber: proof.taskNumber },
  ]);
  // Mix was removed after its edit, so undoing the edit leaves it removed.
  expect(
    await changeListItem(owner.id, quest.id, list.id, {
      kind: "undo",
      version: edited,
    }),
  ).toBe("unchanged");
});
