import { expect, test, vi } from "vitest";
import {
  listPerformances,
  startPerformance,
} from "@/performances/performance-store.ts";
import { QUEST_NAME } from "@/quests/quest-name.ts";
import { createQuest } from "@/quests/store.ts";
import { saveRiteAction } from "@/rites/rite-actions.ts";
import {
  changeRiteAvailability,
  listRites,
  OWN_RITE_ID,
} from "@/rites/rite-store.ts";
import { listSpaces } from "@/spaces/space-store.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));

test("use_case_customize_rite", async () => {
  const [author, stranger] = await Promise.all([testUser(), testUser()]);
  const { id: questId } = await createQuest(
    author.id,
    QUEST_NAME.parse("Workshop"),
  );
  const [space] = await listSpaces(author.id, questId);
  if (space === undefined) {
    throw new Error("The quest has no starting space");
  }

  await signIn(author);
  const original = { name: "Plan", replies: ["First reply", "Second reply"] };
  const created = await saveRiteAction(original);
  expect(created.kind).toBe("saved");
  if (created.kind !== "saved") {
    throw new Error("The rite was not saved");
  }
  const id = OWN_RITE_ID.parse(created.id);
  const performance = await startPerformance(author.id, questId, {
    spaceId: space.id,
    riteId: id,
  });
  expect(performance?.rite).toEqual(original);

  await signIn(stranger);
  expect(await saveRiteAction({ ...original, id, name: "Override" })).toEqual({
    kind: "unavailable",
  });
  expect(await listRites(stranger.id)).not.toContainEqual(
    expect.objectContaining({ id }),
  );

  await signIn(author);
  expect(await saveRiteAction({ ...original, id, replies: [] })).toMatchObject({
    kind: "invalid",
    field: "replies",
  });
  expect(
    await saveRiteAction({ id, name: "New plan", replies: ["A new reply"] }),
  ).toMatchObject({ kind: "saved", id });
  expect(await changeRiteAvailability(author.id, id, "forget")).toBe(true);
  expect(
    await startPerformance(author.id, questId, {
      spaceId: space.id,
      riteId: id,
    }),
  ).toBeUndefined();
  expect(await listRites(author.id, true)).toMatchObject([
    { id, name: "New plan" },
  ]);
  expect(await changeRiteAvailability(author.id, id, "delete")).toBe(true);
  expect(await listPerformances(author.id, questId)).toMatchObject([
    { rite: original, endedAt: null },
  ]);
});

test("use_case_retire_definitions", async () => {
  const { owner, id } = await ownRite();
  expect(await changeRiteAvailability(owner.id, id, "forget")).toBe(true);
  expect(await listRites(owner.id)).not.toContainEqual(
    expect.objectContaining({ id }),
  );
});

test("use_case_restore_retired_definition", async () => {
  const { owner, id } = await ownRite();
  await changeRiteAvailability(owner.id, id, "forget");
  expect(await changeRiteAvailability(owner.id, id, "restore")).toBe(true);
  expect(await listRites(owner.id)).toContainEqual(
    expect.objectContaining({ id, name: "Plan" }),
  );
});

test("use_case_delete_retired_definition", async () => {
  const { owner, id } = await ownRite();
  expect(await changeRiteAvailability(owner.id, id, "delete")).toBe(false);
  await changeRiteAvailability(owner.id, id, "forget");
  expect(await changeRiteAvailability(owner.id, id, "delete")).toBe(true);
  expect(await listRites(owner.id, true)).toEqual([]);
});

async function ownRite(): Promise<{
  readonly owner: Awaited<ReturnType<typeof testUser>>;
  readonly id: ReturnType<typeof OWN_RITE_ID.parse>;
}> {
  const owner = await testUser();
  await signIn(owner);
  const result = await saveRiteAction({
    name: "Plan",
    replies: ["First reply"],
  });
  if (result.kind !== "saved") {
    throw new Error("The rite was not saved");
  }
  return { owner, id: OWN_RITE_ID.parse(result.id) };
}
