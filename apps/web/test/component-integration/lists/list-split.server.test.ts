// "use_case_split_list_item" in use-cases/lists.md, against the database:
// a split replaces a list item with its parts in its place, and Undo puts
// the item back.

import { expect, test } from "vitest";
import { readExperience } from "@/experience/experience-store.ts";
import { readListItems, writeListContents } from "@/lists/list-item-store.ts";
import { readLists } from "@/lists/list-store.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import {
  addInvitee,
  addMember,
  addRemovedMember,
} from "../quests/quest-members-test-kit.ts";

test("use_case_split_list_item", async () => {
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
  const listId = list.id;
  // In turn, so the list items keep this order.
  await ["Mix", "Shop for flour and yeast", "Bake"].reduce(
    async (previous, text) => {
      await previous;
      await writeListContents(owner.id, quest.id, listId, {
        kind: "add",
        text,
      });
    },
    Promise.resolve(),
  );
  const [mix, shop, bake] = await readListItems(owner.id, quest.id, listId);
  if (mix === undefined || shop === undefined || bake === undefined) {
    throw new Error("Missing tasks");
  }
  await writeListContents(owner.id, quest.id, listId, {
    kind: "recurring",
    id: shop.id,
    cadence: "weekly",
  });
  const split = {
    kind: "split" as const,
    id: shop.id,
    texts: ["Shop for flour", "Shop for yeast", "Shop for salt"],
  };
  const outsiders = await Promise.all(
    [pending, removed].map((outsider) =>
      writeListContents(outsider.id, quest.id, listId, split),
    ),
  );
  expect(outsiders.map(({ result }) => result)).toEqual(["missing", "missing"]);
  expect(
    (
      await writeListContents(member.id, quest.id, listId, {
        ...split,
        texts: ["Shop for flour", " "],
      })
    ).result,
  ).toBe("invalid-text");

  const saved = await writeListContents(member.id, quest.id, listId, split);

  // The first part keeps the task, and the rest follow it with new numbers,
  // repeating as it does.
  expect(saved.list?.listItems).toMatchObject([
    { id: mix.id, text: "Mix" },
    { id: shop.id, text: "Shop for flour", taskNumber: shop.taskNumber },
    { text: "Shop for yeast", taskNumber: 4, recurring: true },
    { text: "Shop for salt", taskNumber: 5, cadence: "weekly" },
    { id: bake.id, text: "Bake" },
  ]);
  expect((await readExperience(member.id)).counts.adding).toBe(2);
  const version = saved.list?.version;
  if (version === undefined) {
    throw new Error("Missing change version");
  }

  const undone = await writeListContents(owner.id, quest.id, listId, {
    kind: "undo",
    version,
  });
  expect(undone.list?.listItems.map(({ text }) => text)).toEqual([
    "Mix",
    "Shop for flour and yeast",
    "Bake",
  ]);
});

test("use_case_split_list_item: Undo keeps a part changed since", async () => {
  const owner = await testUser();
  const quest = await testData(owner).quest();
  const [list] = await readLists(owner.id, quest.id);
  if (list === undefined) {
    throw new Error("Missing list");
  }
  const listId = list.id;
  await writeListContents(owner.id, quest.id, listId, {
    kind: "add",
    text: "Wash and dry",
  });
  const [wash] = await readListItems(owner.id, quest.id, listId);
  if (wash === undefined) {
    throw new Error("Missing task");
  }
  const saved = await writeListContents(owner.id, quest.id, listId, {
    kind: "split",
    id: wash.id,
    texts: ["Wash", "Dry"],
  });
  const dry = saved.list?.listItems[1];
  const version = saved.list?.version;
  if (dry === undefined || version === undefined) {
    throw new Error("Missing split");
  }
  await writeListContents(owner.id, quest.id, listId, {
    kind: "check",
    id: dry.id,
    checkedOff: true,
  });

  expect(
    (
      await writeListContents(owner.id, quest.id, listId, {
        kind: "undo",
        version,
      })
    ).result,
  ).toBe("unchanged");
  expect(
    (await readListItems(owner.id, quest.id, listId)).map(({ text }) => text),
  ).toEqual(["Wash", "Dry"]);
});
