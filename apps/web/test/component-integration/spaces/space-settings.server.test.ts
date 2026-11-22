import { expect, test, vi } from "vitest";
import { getConstruct } from "@/constructs/index.ts";
import { startQuest } from "@/conversations/start-quest.ts";
import { readExperience } from "@/experience/experience-store.ts";
import { QUEST_NAME } from "@/quests/quest-name.ts";
import { changeMurmlingAction } from "@/spaces/murmling-actions.ts";
import { listMurmlings } from "@/spaces/murmling-store.ts";
import { saveSpaceAction } from "@/spaces/space-actions.ts";
import { listSpaces } from "@/spaces/space-store.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { formOf } from "../test-database/chat-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));

test("use_case_set_up_space", async () => {
  const [owner, stranger] = await Promise.all([testUser(), testUser()]);
  const started = await startQuest(
    owner.id,
    QUEST_NAME.parse("Workshop"),
    getConstruct("vellum"),
  );
  if (started.kind !== "started") {
    throw new Error("The quest did not start");
  }
  const questId = started.chat.quest.id;
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
  const started = await startQuest(
    owner.id,
    QUEST_NAME.parse("Garden"),
    getConstruct("vellum"),
  );
  if (started.kind !== "started") {
    throw new Error("The quest did not start");
  }
  const questId = started.chat.quest.id;
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
  ).toBeUndefined();
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
  ).toBeUndefined();
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
  ).toBeUndefined();
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
  ).toBeUndefined();
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
  ).toBeUndefined();
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
  ).toBeUndefined();
  expect(
    await changeMurmlingAction({
      questId,
      spaceId: destination.id,
      change: { kind: "type", id, type: "plain" },
    }),
  ).toContain("one line");
  expect(
    (await listMurmlings(owner.id, questId, destination.id))[0],
  ).toMatchObject({ type: "quick-note", text: "Basil\nNeeds sun" });
});
