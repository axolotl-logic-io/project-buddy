import { expect, test, vi } from "vitest";
import { readExperience } from "@/experience/experience-store.ts";
import { saveListAction } from "@/lists/list-actions.ts";
import { changeListItemAction } from "@/lists/list-item-actions.ts";
import { readListItems } from "@/lists/list-item-store.ts";
import { type List, readLists } from "@/lists/list-store.ts";
import { QUEST_NAME } from "@/quests/quest-name.ts";
import { createQuest } from "@/quests/store.ts";
import { LISTS_COPY } from "@/ui/copy/lists.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { formOf } from "../test-database/form-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));

test("use_case_set_up_list", async () => {
  const [owner, stranger] = await Promise.all([testUser(), testUser()]);
  const { id: questId } = await createQuest(
    owner.id,
    QUEST_NAME.parse("Workshop"),
  );
  await signIn(owner);
  const fields = {
    questId,
    name: "Plans",
    type: "task",
  };

  const invalid = await saveListAction({}, formOf({ ...fields, name: " " }));
  expect(invalid.error).toContain("name");
  const { type: draftType } = invalid.draft ?? {};
  expect(draftType).toBe("task");
  expect((await readLists(owner.id, questId)).map(({ name }) => name)).toEqual([
    "Tasks",
    "Ideas",
  ]);

  expect(await saveListAction({}, formOf(fields))).toEqual({ saved: true });
  const lists = await readLists(owner.id, questId);
  const added = lists.at(-1);
  if (added === undefined) {
    throw new Error("The new list was not listed");
  }
  expect(lists.map(({ name }) => name)).toEqual(["Tasks", "Ideas", "Plans"]);
  expect(added).toMatchObject({ type: "task" });

  const edit = formOf({
    ...fields,
    name: "Sketches",
    type: "plain",
    listId: added.id,
  });
  expect(await saveListAction({}, edit)).toEqual({ saved: true });
  expect((await readLists(owner.id, questId)).at(-1)).toMatchObject({
    id: added.id,
    name: "Sketches",
    type: "plain",
  });

  await signIn(stranger);
  expect((await saveListAction({}, edit)).error).toBe(
    "This list is unavailable.",
  );
  expect(await readLists(stranger.id, questId)).toEqual([]);
});

test("use_case_list_types", async () => {
  const owner = await testUser();
  const { id: questId } = await createQuest(
    owner.id,
    QUEST_NAME.parse("Garden"),
  );
  const [tasks, ideas] = await readLists(owner.id, questId);
  if (tasks === undefined || ideas === undefined) {
    throw new Error("The starting lists were not saved");
  }
  await signIn(owner);
  function settings(list: List, type: string): Record<string, string> {
    return {
      questId,
      listId: list.id,
      name: list.name,
      type,
    };
  }

  // An item added to a plain list has no task number.
  expect(
    await changeListItemAction({
      questId,
      listId: ideas.id,
      change: { kind: "add", text: "Plant basil" },
    }),
  ).toMatchObject({ kind: "saved" });
  const [added] = await readListItems(owner.id, questId, ideas.id);
  if (added === undefined) {
    throw new Error("The list item was not saved");
  }
  expect(added.taskNumber).toBeNull();
  const { id } = added;

  // Moving it to a task list makes it a task.
  expect(
    await changeListItemAction({
      questId,
      listId: ideas.id,
      change: { kind: "move", id, destination: tasks.id },
    }),
  ).toMatchObject({ kind: "saved" });
  expect(await readListItems(owner.id, questId, ideas.id)).toEqual([]);
  expect((await readListItems(owner.id, questId, tasks.id))[0]).toMatchObject({
    id,
    taskNumber: 1,
    text: "Plant basil",
  });
  expect(
    await changeListItemAction({
      questId,
      listId: tasks.id,
      change: { kind: "check", id, checkedOff: true },
    }),
  ).toMatchObject({ kind: "saved" });
  const addingAndCheckingOff = 4;
  expect((await readExperience(owner.id)).experience).toBe(
    addingAndCheckingOff,
  );

  // Changing the list's type converts its items and takes back the
  // check-off's experience.
  expect(
    await saveListAction({}, formOf(settings(tasks, "quick-note"))),
  ).toEqual({ saved: true });
  expect((await readExperience(owner.id)).experience).toBe(1);
  expect((await readListItems(owner.id, questId, tasks.id))[0]).toMatchObject({
    id,
    taskNumber: null,
    createdAt: added.createdAt,
    checkedOff: false,
    text: "Plant basil",
  });
  expect(
    await changeListItemAction({
      questId,
      listId: tasks.id,
      change: { kind: "edit", id, text: "Basil\nNeeds sun" },
    }),
  ).toMatchObject({ kind: "saved" });

  // A note too long for a plain list can't move there, and its list can't
  // become a plain list.
  expect(
    await changeListItemAction({
      questId,
      listId: tasks.id,
      change: { kind: "move", id, destination: ideas.id },
    }),
  ).toMatchObject({
    kind: "problem",
    text: expect.stringContaining("one line"),
  });
  expect(await saveListAction({}, formOf(settings(tasks, "plain")))).toEqual({
    draft: expect.any(Object),
    error: LISTS_COPY.typeTooLong,
  });
  expect((await readLists(owner.id, questId))[0]).toMatchObject({
    type: "quick-note",
  });
  expect((await readListItems(owner.id, questId, tasks.id))[0]).toMatchObject({
    id,
    text: "Basil\nNeeds sun",
  });
});

test("use_case_quest_lists", async () => {
  const [owner, stranger] = await Promise.all([testUser(), testUser()]);
  const { id: questId } = await createQuest(
    owner.id,
    QUEST_NAME.parse("Workshop"),
  );
  const [source, destination] = await readLists(owner.id, questId);
  if (source === undefined || destination === undefined) {
    throw new Error("The starting lists were not saved");
  }
  await signIn(owner);

  await changeListItemAction({
    questId,
    listId: source.id,
    change: { kind: "add", text: "Second" },
  });
  await changeListItemAction({
    questId,
    listId: source.id,
    change: { kind: "add", text: "First" },
  });
  const [second, first] = await readListItems(owner.id, questId, source.id);
  if (second === undefined || first === undefined) {
    throw new Error("The list items were not saved");
  }
  expect(
    await changeListItemAction({
      questId,
      listId: source.id,
      change: { kind: "place", id: first.id, before: second.id },
    }),
  ).toMatchObject({ kind: "saved" });
  expect(
    await changeListItemAction({
      questId,
      listId: source.id,
      change: { kind: "edit", id: first.id, text: "First draft" },
    }),
  ).toMatchObject({ kind: "saved" });
  expect(
    (await readListItems(owner.id, questId, source.id)).map(({ text }) => text),
  ).toEqual(["First draft", "Second"]);

  expect(
    await changeListItemAction({
      questId,
      listId: source.id,
      change: { kind: "move", id: first.id, destination: destination.id },
    }),
  ).toMatchObject({ kind: "saved" });
  expect(await readListItems(owner.id, questId, destination.id)).toMatchObject([
    {
      id: first.id,
      taskNumber: null,
      text: "First draft",
    },
  ]);
  const removal = {
    questId,
    listId: source.id,
    change: { kind: "remove", id: second.id },
  };
  await signIn(stranger);
  expect(await changeListItemAction(removal)).toMatchObject({
    kind: "problem",
  });
  expect(await readListItems(stranger.id, questId, source.id)).toEqual([]);
  expect(await readListItems(owner.id, questId, source.id)).toMatchObject([
    { id: second.id },
  ]);

  await signIn(owner);
  expect(await changeListItemAction(removal)).toMatchObject({ kind: "saved" });
  expect(await readListItems(owner.id, questId, source.id)).toEqual([]);
});
