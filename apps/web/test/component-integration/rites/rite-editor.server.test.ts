import { expect, test, vi } from "vitest";
import { getConstruct } from "@/constructs/index.ts";
import { startQuest } from "@/conversations/start-quest.ts";
import {
  listPerformances,
  startPerformance,
} from "@/performances/performance-store.ts";
import { QUEST_NAME } from "@/quests/quest-name.ts";
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
  const started = await startQuest(
    author.id,
    QUEST_NAME.parse("Workshop"),
    getConstruct("vellum"),
  );
  if (started.kind !== "started") {
    throw new Error("The quest did not start");
  }
  const questId = started.chat.quest.id;
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
