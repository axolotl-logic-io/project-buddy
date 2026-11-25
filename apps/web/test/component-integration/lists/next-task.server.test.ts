// "use_case_ask_whats_next" in use-cases/tasks.md, against the test
// database: a quest's next task, as its Overview reads it.

import { expect, test } from "vitest";
import {
  readListItems,
  readNextTasks,
  writeListContents,
} from "@/lists/list-item-store.ts";
import { readLists, saveList } from "@/lists/list-store.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";

test("use_case_ask_whats_next", async () => {
  const user = await testUser();
  const quest = await testData(user).quest();
  const [first, second] = await readLists(user.id, quest.id);
  if (first === undefined || second === undefined) {
    throw new Error("The quest has no starting lists");
  }
  expect(await readNextTasks(user.id, quest.id, 1)).toEqual([]);
  // The plain second list sits between two task lists.
  const later = await saveList(user.id, quest.id, {
    name: "Later",
    type: "task",
  });
  if (later === undefined || later === "invalid-text") {
    throw new Error("The later list was not saved");
  }
  await writeListContents(user.id, quest.id, later.id, {
    kind: "add",
    text: "In a later list",
  });
  await writeListContents(user.id, quest.id, second.id, {
    kind: "add",
    text: "A possibility",
  });
  await writeListContents(user.id, quest.id, first.id, {
    kind: "add",
    text: "In the first list",
  });
  const [firstTask] = await readListItems(user.id, quest.id, first.id);
  if (firstTask === undefined) {
    throw new Error("The task was not saved");
  }
  expect((await readNextTasks(user.id, quest.id, 1))[0]?.text).toBe(
    firstTask.text,
  );
  await writeListContents(user.id, quest.id, first.id, {
    kind: "check",
    id: firstTask.id,
    checkedOff: true,
  });
  expect((await readNextTasks(user.id, quest.id, 1))[0]?.text).toBe(
    "In a later list",
  );
});
