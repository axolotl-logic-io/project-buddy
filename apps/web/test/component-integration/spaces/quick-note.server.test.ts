import { expect, test, vi } from "vitest";
import { QUEST_ID } from "@/ids.ts";
import { QUEST_NAME } from "@/quests/quest-name.ts";
import { changeQuestStatus } from "@/quests/quest-status-store.ts";
import { createQuest } from "@/quests/store.ts";
import { listMurmlings } from "@/spaces/murmling-store.ts";
import { NOTE_MAX_LENGTH } from "@/spaces/quick-note.ts";
import {
  listQuickNoteQuests,
  saveQuickNote,
} from "@/spaces/quick-note-actions.ts";
import { listSpaces } from "@/spaces/space-store.ts";
import { QUICK_NOTE_COPY } from "@/ui/copy/notes.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { addMember } from "../quests/quest-members-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));

test("use_case_quick_note", async () => {
  const owner = await testUser();
  await createQuest(owner.id, QUEST_NAME.parse("Pottery"));
  await signIn(owner);
  const [quest] = await listQuickNoteQuests();
  const [first, second] = quest?.spaces ?? [];
  if (quest === undefined || first === undefined || second === undefined) {
    throw new Error("The starting spaces were not offered");
  }
  const target = { questId: quest.id, spaceId: second.id };
  expect(await saveQuickNote({ ...target, text: "First thought" })).toEqual({
    kind: "saved",
  });
  expect(await saveQuickNote({ ...target, text: "  Clay\nGlaze  " })).toEqual({
    kind: "saved",
  });
  const spaces = await listSpaces(owner.id, QUEST_ID.parse(quest.id));
  const destination = spaces.find(({ id }) => id === second.id);
  if (destination === undefined) {
    throw new Error("The destination space was not found");
  }
  expect(
    await listMurmlings(owner.id, QUEST_ID.parse(quest.id), destination.id),
  ).toMatchObject([
    { text: "Clay\nGlaze", type: "quick-note", createdAt: expect.any(Date) },
    { text: "First thought", type: "quick-note", createdAt: expect.any(Date) },
  ]);
});

// A new user, signed in, with one quest of the name and its first space.
async function ownerWithQuest(name: string): Promise<{
  readonly owner: Awaited<ReturnType<typeof testUser>>;
  readonly quest: Awaited<ReturnType<typeof createQuest>>;
  readonly spaceId: Awaited<ReturnType<typeof listSpaces>>[number]["id"];
}> {
  const owner = await testUser();
  const quest = await createQuest(owner.id, QUEST_NAME.parse(name));
  const [space] = await listSpaces(owner.id, quest.id);
  if (space === undefined) {
    throw new Error("The starting spaces were not saved");
  }
  await signIn(owner);
  return { owner, quest, spaceId: space.id };
}

test("use_case_quick_note: Completed and Abandoned quests aren't offered or saved to", async () => {
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

  expect((await listQuickNoteQuests()).map(({ id }) => id)).toEqual([
    active.id,
  ]);
  // Saving to a closed quest is refused, and its space stays empty.
  async function trySaving(closed: typeof completed): Promise<unknown> {
    const [space] = await listSpaces(owner.id, closed.id);
    if (space === undefined) {
      throw new Error("The closed quest kept no spaces");
    }
    const result = await saveQuickNote({
      questId: closed.id,
      spaceId: space.id,
      text: "Too late",
    });
    return [result, await listMurmlings(owner.id, closed.id, space.id)];
  }
  const refused = [
    { kind: "problem", text: QUICK_NOTE_COPY.spaceUnavailable },
    [],
  ];
  expect(await Promise.all([completed, abandoned].map(trySaving))).toEqual([
    refused,
    refused,
  ]);
});

test("use_case_quick_note: empty or over-long text is refused with its reason", async () => {
  const { owner, quest, spaceId } = await ownerWithQuest("Pottery");
  const target = { questId: quest.id, spaceId };

  expect(await saveQuickNote({ ...target, text: " \n\t " })).toEqual({
    kind: "problem",
    text: QUICK_NOTE_COPY.problem("empty"),
  });
  expect(
    await saveQuickNote({
      ...target,
      text: "a".repeat(NOTE_MAX_LENGTH + 1),
    }),
  ).toEqual({ kind: "problem", text: QUICK_NOTE_COPY.problem("too-long") });
  expect(await listMurmlings(owner.id, quest.id, spaceId)).toEqual([]);

  const longest = "a".repeat(NOTE_MAX_LENGTH);
  expect(await saveQuickNote({ ...target, text: `  ${longest}  ` })).toEqual({
    kind: "saved",
  });
  expect(await listMurmlings(owner.id, quest.id, spaceId)).toMatchObject([
    { text: longest, type: "quick-note" },
  ]);
});

test("use_case_quick_note: a member is offered the shared quest and saves to it", async () => {
  const [{ owner, quest, spaceId }, member] = await Promise.all([
    ownerWithQuest("Shared studio"),
    testUser(),
  ]);
  await addMember(owner, quest.id, member);
  await signIn(member);

  expect(await listQuickNoteQuests()).toMatchObject([
    { id: quest.id, sharing: { kind: "joined" } },
  ]);
  expect(
    await saveQuickNote({ questId: quest.id, spaceId, text: "Buy glaze" }),
  ).toEqual({ kind: "saved" });
  expect(await listMurmlings(owner.id, quest.id, spaceId)).toMatchObject([
    { text: "Buy glaze", type: "quick-note" },
  ]);
});
