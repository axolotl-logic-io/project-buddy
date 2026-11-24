import { expect, test, vi } from "vitest";
import { QUEST_ID } from "@/ids.ts";
import { LIST_ID } from "@/lists/list.ts";
import { readListItems } from "@/lists/list-item-store.ts";
import { readLists, saveList } from "@/lists/list-store.ts";
import { QUICK_ADD_MAX_LENGTH } from "@/lists/quick-add.ts";
import { listQuickAddQuests, saveQuickAdd } from "@/lists/quick-add-actions.ts";
import { QUEST_NAME } from "@/quests/quest-name.ts";
import { changeQuestStatus } from "@/quests/quest-status-store.ts";
import { createQuest } from "@/quests/store.ts";
import { QUICK_ADD_COPY } from "@/ui/copy/quick-add.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { addMember } from "../quests/quest-members-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));

test("use_case_quick_add", async () => {
  const owner = await testUser();
  await createQuest(owner.id, QUEST_NAME.parse("Pottery"));
  await signIn(owner);
  const [quest] = await listQuickAddQuests();
  const [first, second] = quest?.lists ?? [];
  if (quest === undefined || first === undefined || second === undefined) {
    throw new Error("The starting lists were not offered");
  }
  const questId = QUEST_ID.parse(quest.id);
  // The item takes the list's type: a plain item in Ideas, a task in Tasks.
  const ideas = { questId: quest.id, listId: second.id };
  expect(await saveQuickAdd({ ...ideas, text: "First thought" })).toEqual({
    kind: "saved",
  });
  expect(
    await saveQuickAdd({ questId: quest.id, listId: first.id, text: "Fire" }),
  ).toEqual({ kind: "saved" });
  // A plain list takes one line only.
  expect(await saveQuickAdd({ ...ideas, text: "  Clay\nGlaze  " })).toEqual({
    kind: "problem",
    text: QUICK_ADD_COPY.tooLongForList,
  });
  expect(
    await readListItems(owner.id, questId, LIST_ID.parse(second.id)),
  ).toMatchObject([
    { text: "First thought", taskNumber: null, createdAt: expect.any(Date) },
  ]);
  expect(
    await readListItems(owner.id, questId, LIST_ID.parse(first.id)),
  ).toMatchObject([{ text: "Fire", taskNumber: 1 }]);
});

// A new user, signed in, with one quest of the name and its first list.
async function ownerWithQuest(name: string): Promise<{
  readonly owner: Awaited<ReturnType<typeof testUser>>;
  readonly quest: Awaited<ReturnType<typeof createQuest>>;
  readonly listId: Awaited<ReturnType<typeof readLists>>[number]["id"];
}> {
  const owner = await testUser();
  const quest = await createQuest(owner.id, QUEST_NAME.parse(name));
  const [list] = await readLists(owner.id, quest.id);
  if (list === undefined) {
    throw new Error("The starting lists were not saved");
  }
  await signIn(owner);
  return { owner, quest, listId: list.id };
}

test("use_case_quick_add: Completed and Abandoned quests aren't offered or saved to", async () => {
  const { owner, quest: active } = await ownerWithQuest("Pottery");
  const data = testData(owner);
  const [completed, abandoned] = await Promise.all([
    data.quest("Finished mugs"),
    data.quest("Dropped kiln"),
  ]);
  await Promise.all([
    changeQuestStatus(owner.id, {
      questId: completed.id,
      fromStatus: "active",
      toStatus: "completed",
      revision: 0,
    }),
    changeQuestStatus(owner.id, {
      questId: abandoned.id,
      fromStatus: "active",
      toStatus: "abandoned",
      revision: 0,
    }),
  ]);

  expect((await listQuickAddQuests()).map(({ id }) => id)).toEqual([active.id]);
  // Saving to a closed quest is refused, and its list stays empty.
  async function trySaving(closed: typeof completed): Promise<unknown> {
    const [list] = await readLists(owner.id, closed.id);
    if (list === undefined) {
      throw new Error("The closed quest kept no lists");
    }
    const result = await saveQuickAdd({
      questId: closed.id,
      listId: list.id,
      text: "Too late",
    });
    return [result, await readListItems(owner.id, closed.id, list.id)];
  }
  const refused = [
    { kind: "problem", text: QUICK_ADD_COPY.listUnavailable },
    [],
  ];
  expect(await Promise.all([completed, abandoned].map(trySaving))).toEqual([
    refused,
    refused,
  ]);
});

test("use_case_quick_add: empty or over-long text is refused with its reason", async () => {
  const { owner, quest } = await ownerWithQuest("Pottery");
  const notes = await saveList(owner.id, quest.id, {
    name: "Notes",
    checkOff: "Complete",
    uncheck: "Reopen",
    type: "quick-note",
  });
  if (notes === undefined || notes === "invalid-text") {
    throw new Error("The notes list was not saved");
  }
  const listId = notes.id;
  const target = { questId: quest.id, listId };

  expect(await saveQuickAdd({ ...target, text: " \n\t " })).toEqual({
    kind: "problem",
    text: QUICK_ADD_COPY.problem("empty"),
  });
  expect(
    await saveQuickAdd({
      ...target,
      text: "a".repeat(QUICK_ADD_MAX_LENGTH + 1),
    }),
  ).toEqual({ kind: "problem", text: QUICK_ADD_COPY.problem("too-long") });
  expect(await readListItems(owner.id, quest.id, listId)).toEqual([]);

  const longest = "a".repeat(QUICK_ADD_MAX_LENGTH);
  expect(await saveQuickAdd({ ...target, text: `  ${longest}  ` })).toEqual({
    kind: "saved",
  });
  expect(await readListItems(owner.id, quest.id, listId)).toMatchObject([
    { text: longest },
  ]);
});

test("use_case_quick_add: a member is offered the shared quest and saves to it", async () => {
  const [{ owner, quest, listId }, member] = await Promise.all([
    ownerWithQuest("Shared studio"),
    testUser(),
  ]);
  await addMember(owner, quest.id, member);
  await signIn(member);

  expect(await listQuickAddQuests()).toMatchObject([
    { id: quest.id, sharing: { kind: "joined" } },
  ]);
  expect(
    await saveQuickAdd({ questId: quest.id, listId, text: "Buy glaze" }),
  ).toEqual({ kind: "saved" });
  expect(await readListItems(owner.id, quest.id, listId)).toMatchObject([
    { text: "Buy glaze" },
  ]);
});
