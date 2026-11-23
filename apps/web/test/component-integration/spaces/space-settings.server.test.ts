import { expect, test, vi } from "vitest";
import { readExperience } from "@/experience/experience-store.ts";
import { QUEST_NAME } from "@/quests/quest-name.ts";
import { createQuest } from "@/quests/store.ts";
import { changeMurmlingAction } from "@/spaces/murmling-actions.ts";
import { listMurmlings } from "@/spaces/murmling-store.ts";
import { saveSpaceAction } from "@/spaces/space-actions.ts";
import { listSpaces } from "@/spaces/space-store.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { formOf } from "../test-database/form-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));

test("use_case_set_up_space", async () => {
  const [owner, stranger] = await Promise.all([testUser(), testUser()]);
  const { id: questId } = await createQuest(
    owner.id,
    QUEST_NAME.parse("Workshop"),
  );
  await signIn(owner);
  const fields = {
    questId,
    name: "Plans",
    singular: "plan",
    plural: "plans",
    checkOff: "Finish",
    uncheck: "Resume",
    newType: "task",
  };

  const invalid = await saveSpaceAction({}, formOf({ ...fields, plural: " " }));
  expect(invalid.error).toContain("plural");
  const { name: draftName } = invalid.draft ?? {};
  expect(draftName).toBe("Plans");
  expect((await listSpaces(owner.id, questId)).map(({ name }) => name)).toEqual(
    ["Tasks", "Ideas"],
  );

  expect(await saveSpaceAction({}, formOf(fields))).toEqual({ saved: true });
  const spaces = await listSpaces(owner.id, questId);
  const added = spaces.at(-1);
  if (added === undefined) {
    throw new Error("The new space was not listed");
  }
  expect(spaces.map(({ name }) => name)).toEqual(["Tasks", "Ideas", "Plans"]);
  expect(added).toMatchObject({
    singular: "plan",
    plural: "plans",
    checkOff: "Finish",
    uncheck: "Resume",
    newType: "task",
  });

  const edit = formOf({
    ...fields,
    name: "Sketches",
    newType: "plain",
    spaceId: added.id,
  });
  expect(await saveSpaceAction({}, edit)).toEqual({ saved: true });
  expect((await listSpaces(owner.id, questId)).at(-1)).toMatchObject({
    id: added.id,
    name: "Sketches",
    newType: "plain",
  });

  await signIn(stranger);
  expect((await saveSpaceAction({}, edit)).error).toBe(
    "This space is unavailable.",
  );
  expect(await listSpaces(stranger.id, questId)).toEqual([]);
});

test("use_case_murmling_types", async () => {
  const owner = await testUser();
  const { id: questId } = await createQuest(
    owner.id,
    QUEST_NAME.parse("Garden"),
  );
  const [destination, space] = await listSpaces(owner.id, questId);
  if (space === undefined || destination === undefined) {
    throw new Error("The starting spaces were not saved");
  }

  await signIn(owner);
  expect(
    await changeMurmlingAction({
      questId,
      spaceId: space.id,
      change: { kind: "add", text: "Plant basil" },
    }),
  ).toMatchObject({ kind: "saved" });
  const [added] = await listMurmlings(owner.id, questId, space.id);
  if (added === undefined) {
    throw new Error("The murmling was not saved");
  }
  expect(added.type).toBe("plain");
  const { id } = added;
  expect(
    await changeMurmlingAction({
      questId,
      spaceId: space.id,
      change: { kind: "type", id, type: "task" },
    }),
  ).toMatchObject({ kind: "saved" });
  expect((await listMurmlings(owner.id, questId, space.id))[0]).toMatchObject({
    id,
    type: "task",
    taskNumber: 1,
    text: "Plant basil",
  });
  expect(
    await changeMurmlingAction({
      questId,
      spaceId: space.id,
      change: { kind: "move", id, destination: destination.id },
    }),
  ).toMatchObject({ kind: "saved" });
  expect(await listMurmlings(owner.id, questId, space.id)).toEqual([]);
  expect(
    (await listMurmlings(owner.id, questId, destination.id))[0],
  ).toMatchObject({ id, type: "task", taskNumber: 1 });
  expect(
    await changeMurmlingAction({
      questId,
      spaceId: destination.id,
      change: { kind: "check", id, checkedOff: true },
    }),
  ).toMatchObject({ kind: "saved" });
  const addingAndCheckingOff = 4;
  expect((await readExperience(owner.id)).experience).toBe(
    addingAndCheckingOff,
  );
  expect(
    await changeMurmlingAction({
      questId,
      spaceId: destination.id,
      change: { kind: "type", id, type: "quick-note" },
    }),
  ).toMatchObject({ kind: "saved" });
  expect((await readExperience(owner.id)).experience).toBe(1);
  expect(
    (await listMurmlings(owner.id, questId, destination.id))[0],
  ).toMatchObject({
    id,
    type: "quick-note",
    createdAt: added.createdAt,
    checkedOff: false,
    text: "Plant basil",
  });
  expect(
    await changeMurmlingAction({
      questId,
      spaceId: destination.id,
      change: { kind: "edit", id, text: "Basil\nNeeds sun" },
    }),
  ).toMatchObject({ kind: "saved" });
  expect(
    await changeMurmlingAction({
      questId,
      spaceId: destination.id,
      change: { kind: "type", id, type: "plain" },
    }),
  ).toMatchObject({
    kind: "problem",
    text: expect.stringContaining("one line"),
  });
  expect(
    (await listMurmlings(owner.id, questId, destination.id))[0],
  ).toMatchObject({ type: "quick-note", text: "Basil\nNeeds sun" });
});

test("use_case_quest_spaces", async () => {
  const [owner, stranger] = await Promise.all([testUser(), testUser()]);
  const { id: questId } = await createQuest(
    owner.id,
    QUEST_NAME.parse("Workshop"),
  );
  const [source, destination] = await listSpaces(owner.id, questId);
  if (source === undefined || destination === undefined) {
    throw new Error("The starting spaces were not saved");
  }
  await signIn(owner);

  await changeMurmlingAction({
    questId,
    spaceId: source.id,
    change: { kind: "add", text: "Second" },
  });
  await changeMurmlingAction({
    questId,
    spaceId: source.id,
    change: { kind: "add", text: "First" },
  });
  const [second, first] = await listMurmlings(owner.id, questId, source.id);
  if (second === undefined || first === undefined) {
    throw new Error("The murmlings were not saved");
  }
  expect(
    await changeMurmlingAction({
      questId,
      spaceId: source.id,
      change: { kind: "place", id: first.id, before: second.id },
    }),
  ).toMatchObject({ kind: "saved" });
  expect(
    await changeMurmlingAction({
      questId,
      spaceId: source.id,
      change: { kind: "edit", id: first.id, text: "First draft" },
    }),
  ).toMatchObject({ kind: "saved" });
  expect(
    (await listMurmlings(owner.id, questId, source.id)).map(({ text }) => text),
  ).toEqual(["First draft", "Second"]);

  expect(
    await changeMurmlingAction({
      questId,
      spaceId: source.id,
      change: { kind: "move", id: first.id, destination: destination.id },
    }),
  ).toMatchObject({ kind: "saved" });
  expect(await listMurmlings(owner.id, questId, destination.id)).toMatchObject([
    {
      id: first.id,
      taskNumber: first.taskNumber,
      text: "First draft",
      type: "task",
    },
  ]);
  const removal = {
    questId,
    spaceId: source.id,
    change: { kind: "remove", id: second.id },
  };
  await signIn(stranger);
  expect(await changeMurmlingAction(removal)).toMatchObject({
    kind: "problem",
  });
  expect(await listMurmlings(stranger.id, questId, source.id)).toEqual([]);
  expect(await listMurmlings(owner.id, questId, source.id)).toMatchObject([
    { id: second.id },
  ]);

  await signIn(owner);
  expect(await changeMurmlingAction(removal)).toMatchObject({ kind: "saved" });
  expect(await listMurmlings(owner.id, questId, source.id)).toEqual([]);
});
