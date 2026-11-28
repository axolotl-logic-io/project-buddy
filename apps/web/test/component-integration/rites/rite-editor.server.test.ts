import { describe, expect, test, vi } from "vitest";
import { newPerformanceId } from "@/ids.ts";
import { readLists } from "@/lists/list-store.ts";
import {
  listPerformances,
  startPerformance,
} from "@/performances/performance-store.ts";
import { QUEST_NAME } from "@/quests/quest-name.ts";
import { createQuest } from "@/quests/store.ts";
import type { RiteDefinition } from "@/rites/rite.ts";
import { changeRiteAction, saveRiteAction } from "@/rites/rite-actions.ts";
import {
  changeRiteAvailability,
  listRites,
  OWN_RITE_ID,
  readRite,
  saveRite,
} from "@/rites/rite-store.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { expectRedirect } from "../test-database/navigation-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

const SECOND_MS = 1000;

test("use_case_customize_rite", async () => {
  const [author, stranger] = await Promise.all([testUser(), testUser()]);
  const { id: questId } = await createQuest(
    author.id,
    QUEST_NAME.parse("Workshop"),
  );
  const [list] = await readLists(author.id, questId);
  if (list === undefined) {
    throw new Error("The quest has no starting list");
  }

  await signIn(author);
  const original: RiteDefinition = {
    name: "Plan",
    firstMessage: "Plan begins on {list}.",
    replies: ["First reply", "Second reply"],
    order: "ordered",
    loop: false,
    finalReply: "That is the plan for {list}.",
  };
  const created = await saveRiteAction(original);
  expect(created.kind).toBe("saved");
  if (created.kind !== "saved") {
    throw new Error("The rite was not saved");
  }
  const id = OWN_RITE_ID.parse(created.id);
  const performance = await startPerformance(author.id, questId, {
    id: newPerformanceId(),
    listId: list.id,
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
    await saveRiteAction({ ...original, id, firstMessage: " " }),
  ).toMatchObject({ kind: "invalid", field: "firstMessage" });
  expect(
    await saveRiteAction({ ...original, id, finalReply: " " }),
  ).toMatchObject({ kind: "invalid", field: "finalReply" });
  expect(
    await saveRiteAction({
      id,
      name: "New plan",
      firstMessage: "New plan begins.",
      replies: ["A new reply"],
    }),
  ).toMatchObject({ kind: "saved", id });
  expect(await readRite(author.id, id)).toMatchObject({
    firstMessage: "New plan begins.",
  });
  expect(await changeRiteAvailability(author.id, id, "forget")).toBe(true);
  expect(
    await startPerformance(author.id, questId, {
      id: newPerformanceId(),
      listId: list.id,
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
  const owner = await testUser();
  const id = await ownRite(owner, "Plan");
  expect(await changeRiteAvailability(owner.id, id, "forget")).toBe(true);
  expect(await listRites(owner.id)).not.toContainEqual(
    expect.objectContaining({ id }),
  );
});

describe("use_case_view_retirement", () => {
  test("lists only the user's forgotten rites, the most recently forgotten first", async () => {
    const owner = await testUser();
    const [older, newer, active] = await Promise.all([
      ownRite(owner, "Older"),
      ownRite(owner, "Newer"),
      ownRite(owner, "Active"),
    ]);
    const stranger = await testUser();
    const foreign = await ownRite(stranger, "Foreign");
    const now = Date.now();
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(now);
      await changeRiteAvailability(owner.id, older, "forget");
      vi.setSystemTime(now + SECOND_MS);
      await changeRiteAvailability(owner.id, newer, "forget");
      await changeRiteAvailability(stranger.id, foreign, "forget");
    } finally {
      vi.useRealTimers();
    }
    const forgotten = await listRites(owner.id, true);
    expect(forgotten.map(({ id }) => id)).toEqual([newer, older]);
    expect(forgotten[0]?.forgottenAt).toEqual(new Date(now + SECOND_MS));
    expect(await listRites(owner.id)).toContainEqual(
      expect.objectContaining({ id: active }),
    );
    expect(await listRites(owner.id)).not.toContainEqual(
      expect.objectContaining({ id: older }),
    );
  });

  test("a user with no forgotten rites has an empty Forgotten tab", async () => {
    const owner = await testUser();
    await ownRite(owner, "Active");
    expect(await listRites(owner.id, true)).toEqual([]);
  });
});

describe("use_case_restore_retired_definition", () => {
  test("restores the same rite, with its id, replies and source intact", async () => {
    const owner = await testUser();
    await signIn(owner);
    const id = await ownRite(owner, "Plan");
    await changeRiteAvailability(owner.id, id, "forget");
    await expectRedirect(
      () => changeRiteAction(change(id, "restore")),
      "/grimoire",
      {
        filter: "forgotten",
        changed: "restore",
        rite: id,
      },
    );
    expect(await readRite(owner.id, id)).toMatchObject({
      id,
      name: "Plan",
      replies: ["First reply"],
      source: "own",
    });
    expect((await readRite(owner.id, id))?.forgottenAt).toBeUndefined();
    expect(await listRites(owner.id, true)).toEqual([]);
  });

  test("another user can't restore the original", async () => {
    const [owner, stranger] = await Promise.all([testUser(), testUser()]);
    const id = await ownRite(owner, "Plan");
    await changeRiteAvailability(owner.id, id, "forget");
    await signIn(stranger);
    await expectUnavailable(() => changeRiteAction(change(id, "restore")));
    expect(await listRites(owner.id, true)).toMatchObject([{ id }]);
  });

  test("restoring an active rite, again or by an unknown id changes nothing", async () => {
    const owner = await testUser();
    await signIn(owner);
    const id = await ownRite(owner, "Plan");
    await expectUnavailable(() => changeRiteAction(change(id, "restore")));
    await expectUnavailable(() =>
      changeRiteAction(change(crypto.randomUUID(), "restore")),
    );
    await expectUnavailable(() =>
      changeRiteAction(change("not-a-rite", "restore")),
    );
    expect(await readRite(owner.id, id)).toMatchObject({ id, name: "Plan" });
  });
});

describe("use_case_delete_retired_definition", () => {
  test("deletes the forgotten original, keeping past performances' rite snapshots", async () => {
    const owner = await testUser();
    const { id: questId } = await createQuest(
      owner.id,
      QUEST_NAME.parse("Workshop"),
    );
    const [list] = await readLists(owner.id, questId);
    if (list === undefined) {
      throw new Error("The quest has no starting list");
    }
    await signIn(owner);
    const id = await ownRite(owner, "Plan");
    await startPerformance(owner.id, questId, {
      id: newPerformanceId(),
      listId: list.id,
      riteId: id,
    });
    await changeRiteAvailability(owner.id, id, "forget");
    await expectRedirect(
      () => changeRiteAction(change(id, "delete")),
      "/grimoire",
      {
        filter: "forgotten",
        changed: "delete",
        rite: id,
      },
    );
    expect(await readRite(owner.id, id, true)).toBeUndefined();
    expect(await listPerformances(owner.id, questId)).toMatchObject([
      {
        rite: {
          name: "Plan",
          firstMessage: "Plan begins.",
          replies: ["First reply"],
        },
      },
    ]);
  });

  test("an active rite can't be deleted, even one restored after Delete forever was chosen", async () => {
    const owner = await testUser();
    await signIn(owner);
    const id = await ownRite(owner, "Plan");
    await expectUnavailable(() => changeRiteAction(change(id, "delete")));
    await changeRiteAvailability(owner.id, id, "forget");
    // The dialog is open on the forgotten rite while it is restored elsewhere.
    await changeRiteAvailability(owner.id, id, "restore");
    await expectUnavailable(() => changeRiteAction(change(id, "delete")));
    expect(await readRite(owner.id, id)).toMatchObject({ id, name: "Plan" });
  });

  test("a repeated or unknown-id request changes nothing", async () => {
    const owner = await testUser();
    await signIn(owner);
    const [id, kept] = await Promise.all([
      ownRite(owner, "Plan"),
      ownRite(owner, "Kept"),
    ]);
    await Promise.all([
      changeRiteAvailability(owner.id, id, "forget"),
      changeRiteAvailability(owner.id, kept, "forget"),
    ]);
    expect(await changeRiteAvailability(owner.id, id, "delete")).toBe(true);
    await expectUnavailable(() => changeRiteAction(change(id, "delete")));
    await expectUnavailable(() =>
      changeRiteAction(change(crypto.randomUUID(), "delete")),
    );
    await expectUnavailable(() =>
      changeRiteAction(change("not-a-rite", "delete")),
    );
    expect(await listRites(owner.id, true)).toMatchObject([{ id: kept }]);
  });

  test("another user can't delete the original", async () => {
    const [owner, stranger] = await Promise.all([testUser(), testUser()]);
    const id = await ownRite(owner, "Plan");
    await changeRiteAvailability(owner.id, id, "forget");
    await signIn(stranger);
    await expectUnavailable(() => changeRiteAction(change(id, "delete")));
    expect(await listRites(owner.id, true)).toMatchObject([{ id }]);
  });
});

// A form submitting the change to the rite with the id.
function change(id: string, riteChange: "restore" | "delete"): FormData {
  const form = new FormData();
  form.set("id", id);
  form.set("change", riteChange);
  return form;
}

// Passes only if the action leads to the Forgotten tab saying the rite was
// unavailable.
function expectUnavailable(action: () => unknown): Promise<void> {
  return expectRedirect(action, "/grimoire", {
    filter: "forgotten",
    changed: "unavailable",
  });
}

// A new rite of the user's, saved through the Grimoire's action.
async function ownRite(
  owner: Awaited<ReturnType<typeof testUser>>,
  name: string,
): Promise<ReturnType<typeof OWN_RITE_ID.parse>> {
  const saved = await saveRite(owner.id, {
    name,
    firstMessage: `${name} begins.`,
    replies: ["First reply"],
    order: "random",
    loop: true,
    finalReply: "",
  });
  if (saved === undefined) {
    throw new Error("The rite was not saved");
  }
  return OWN_RITE_ID.parse(saved.id);
}
