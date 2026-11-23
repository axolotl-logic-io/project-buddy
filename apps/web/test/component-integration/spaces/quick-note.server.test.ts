import { expect, test, vi } from "vitest";
import { QUEST_ID } from "@/ids.ts";
import { QUEST_NAME } from "@/quests/quest-name.ts";
import { createQuest } from "@/quests/store.ts";
import { listMurmlings } from "@/spaces/murmling-store.ts";
import {
  listQuickNoteQuests,
  saveQuickNote,
} from "@/spaces/quick-note-actions.ts";
import { listSpaces } from "@/spaces/space-store.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
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

  await signIn(await testUser());
  expect(await saveQuickNote({ ...target, text: "Denied" })).toMatchObject({
    kind: "problem",
  });
  expect(await listQuickNoteQuests()).toEqual([]);
});
