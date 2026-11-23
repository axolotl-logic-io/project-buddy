import { expect, test, vi } from "vitest";
import {
  GET as read,
  POST as send,
  DELETE as stop,
} from "@/app/api/v1/quests/[questId]/performances/[performanceId]/route.ts";
import { POST as start } from "@/app/api/v1/quests/[questId]/performances/route.ts";
import {
  conjureAction,
  startPerformanceAction,
  stopPerformanceAction,
} from "@/performances/performance-actions.ts";
import {
  listPerformances,
  readConjurations,
} from "@/performances/performance-store.ts";
import { QUEST_NAME } from "@/quests/quest-name.ts";
import { createQuest } from "@/quests/store.ts";
import { listMurmlings } from "@/spaces/murmling-store.ts";
import { listSpaces } from "@/spaces/space-store.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { callApi, dataOf } from "../api/api-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));

async function setup(): Promise<{
  user: Awaited<ReturnType<typeof testUser>>;
  questId: Parameters<typeof listSpaces>[1];
  spaces: Awaited<ReturnType<typeof listSpaces>>;
}> {
  const user = await testUser();
  const { id: questId } = await createQuest(
    user.id,
    QUEST_NAME.parse("Workshop"),
  );
  await signIn(user);
  return { user, questId, spaces: await listSpaces(user.id, questId) };
}

test("use_case_perform_rite", async () => {
  const {
    user,
    questId,
    spaces: [tasks, ideas],
  } = await setup();
  if (tasks === undefined || ideas === undefined) {
    throw new Error("The quest has no starting spaces");
  }
  expect(
    await startPerformanceAction({
      questId,
      spaceId: ideas.id,
      riteId: "capture",
    }),
  ).toBeUndefined();
  const [first] = await listPerformances(user.id, questId);
  if (first === undefined) {
    throw new Error("The performance was not saved");
  }
  expect(first).toMatchObject({
    rite: { name: "Capture" },
    spaceId: ideas.id,
    endedAt: null,
  });

  const conjuration = {
    questId,
    performanceId: first.id,
    id: crypto.randomUUID(),
    text: "Try a paper prototype",
  };
  await Promise.all([conjureAction(conjuration), conjureAction(conjuration)]);
  expect(await listMurmlings(user.id, questId, ideas.id)).toMatchObject([
    { type: "plain", text: conjuration.text },
  ]);
  expect(await readConjurations(user.id, first.id)).toMatchObject([
    { text: conjuration.text, added: 1 },
  ]);

  expect(
    await startPerformanceAction({
      questId,
      spaceId: tasks.id,
      riteId: "brainstorm",
    }),
  ).toBeUndefined();
  const [second, ended] = await listPerformances(user.id, questId);
  if (second === undefined || ended === undefined) {
    throw new Error("The performances were not listed");
  }
  expect(second).toMatchObject({
    rite: { name: "Brainstorm" },
    spaceId: tasks.id,
    endedAt: null,
  });
  expect(ended).toMatchObject({
    id: first.id,
    closing: "Capture ends. 1 idea added.",
  });
  expect(
    await stopPerformanceAction({ questId, performanceId: second.id }),
  ).toBeUndefined();
  expect(
    (await listPerformances(user.id, questId)).every(
      ({ endedAt }) => endedAt !== null,
    ),
  ).toBe(true);
});

test("use_case_view_performances", async () => {
  const {
    user,
    questId,
    spaces: [space],
  } = await setup();
  if (space === undefined) {
    throw new Error("The quest has no starting spaces");
  }
  await startPerformanceAction({
    questId,
    spaceId: space.id,
    riteId: "capture",
  });
  const [performance] = await listPerformances(user.id, questId);
  if (performance === undefined) {
    throw new Error("The performance was not saved");
  }
  const first = {
    questId,
    performanceId: performance.id,
    id: crypto.randomUUID(),
    text: "Prepare materials",
  };
  expect(await conjureAction(first)).toBeUndefined();
  expect(
    await stopPerformanceAction({ questId, performanceId: performance.id }),
  ).toBeUndefined();
  expect(await conjureAction({ ...first, id: crypto.randomUUID() })).toBe(
    "Start a performance to conjure.",
  );
  expect(await readConjurations(user.id, performance.id)).toMatchObject([
    { text: first.text, added: 1, author: "Quest member" },
  ]);

  const stranger = await testUser();
  expect(await listPerformances(stranger.id, questId)).toEqual([]);
  expect(await readConjurations(stranger.id, performance.id)).toEqual([]);
});

test("use_case_cli_api_performance", async () => {
  const {
    user,
    questId,
    spaces: [space],
  } = await setup();
  if (space === undefined) {
    throw new Error("The quest has no starting spaces");
  }
  const started = await callApi(start, {
    params: { questId },
    body: { riteId: "capture", spaceId: space.id },
  });
  const { id: performanceId } = dataOf(started);
  if (typeof performanceId !== "string") {
    throw new Error("The performance was not started");
  }
  const params = { questId, performanceId };
  const body = { id: crypto.randomUUID(), text: "Make a plan" };
  const sent = await callApi(send, { params, body });
  expect(sent.body).toMatchObject({
    data: { text: body.text, added: 1, reply: expect.any(String) },
  });
  expect(await listMurmlings(user.id, questId, space.id)).toMatchObject([
    { text: body.text, type: "task" },
  ]);

  expect((await callApi(stop, { params, method: "DELETE" })).body).toEqual({
    data: { id: performanceId },
  });
  expect((await callApi(read, { params })).body).toMatchObject({
    data: { id: performanceId, conjurations: [{ text: body.text }] },
  });
  expect(
    (
      await callApi(send, {
        params,
        body: { ...body, id: crypto.randomUUID() },
      })
    ).body,
  ).toMatchObject({ error: { code: "performance_required" } });

  await signIn(await testUser());
  expect((await callApi(read, { params })).body).toMatchObject({
    error: { code: "not_found" },
  });
});
