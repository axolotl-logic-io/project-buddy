import { expect, test } from "vitest";
import {
  GET as read,
  POST as send,
  DELETE as stop,
} from "@/app/api/v1/quests/[questId]/performances/[performanceId]/route.ts";
import { POST as start } from "@/app/api/v1/quests/[questId]/performances/route.ts";
import { readListItems } from "@/lists/list-item-store.ts";
import { readLists } from "@/lists/list-store.ts";
import {
  sendMessageAction,
  startPerformanceAction,
  stopPerformanceAction,
} from "@/performances/performance-actions.ts";
import {
  listPerformances,
  readPerformanceMessages,
} from "@/performances/performance-store.ts";
import { QUEST_NAME } from "@/quests/quest-name.ts";
import { createQuest } from "@/quests/store.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { callApi, dataOf } from "../api/api-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

async function setup(): Promise<{
  user: Awaited<ReturnType<typeof testUser>>;
  questId: Parameters<typeof readLists>[1];
  lists: Awaited<ReturnType<typeof readLists>>;
}> {
  const user = await testUser();
  const { id: questId } = await createQuest(
    user.id,
    QUEST_NAME.parse("Workshop"),
  );
  await signIn(user);
  return { user, questId, lists: await readLists(user.id, questId) };
}

test("use_case_perform_rite", async () => {
  const {
    user,
    questId,
    lists: [tasks, ideas],
  } = await setup();
  if (tasks === undefined || ideas === undefined) {
    throw new Error("The quest has no starting lists");
  }
  expect(
    await startPerformanceAction({
      questId,
      listId: ideas.id,
      riteId: "capture",
    }),
  ).toBeUndefined();
  const [first] = await listPerformances(user.id, questId);
  if (first === undefined) {
    throw new Error("The performance was not saved");
  }
  expect(first).toMatchObject({
    rite: { name: "Capture" },
    listId: ideas.id,
    endedAt: null,
  });

  const message = {
    questId,
    performanceId: first.id,
    id: crypto.randomUUID(),
    text: "Try a paper prototype",
  };
  await Promise.all([sendMessageAction(message), sendMessageAction(message)]);
  expect(await readListItems(user.id, questId, ideas.id)).toMatchObject([
    { text: message.text },
  ]);
  expect(await readPerformanceMessages(user.id, first.id)).toMatchObject([
    { text: message.text, added: 1 },
  ]);

  expect(
    await startPerformanceAction({
      questId,
      listId: tasks.id,
      riteId: "brainstorm",
    }),
  ).toBeUndefined();
  const [second, ended] = await listPerformances(user.id, questId);
  if (second === undefined || ended === undefined) {
    throw new Error("The performances were not listed");
  }
  expect(second).toMatchObject({
    rite: { name: "Brainstorm" },
    listId: tasks.id,
    endedAt: null,
  });
  expect(ended).toMatchObject({
    id: first.id,
    closing: "Capture ends. 1 item added.",
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

test("a stopped performance keeps its messages, and a stranger reads none", async () => {
  const {
    user,
    questId,
    lists: [list],
  } = await setup();
  if (list === undefined) {
    throw new Error("The quest has no starting lists");
  }
  await startPerformanceAction({
    questId,
    listId: list.id,
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
  expect(await sendMessageAction(first)).toBeUndefined();
  expect(
    await stopPerformanceAction({ questId, performanceId: performance.id }),
  ).toBeUndefined();
  expect(await sendMessageAction({ ...first, id: crypto.randomUUID() })).toBe(
    "Start a performance to send a message.",
  );
  expect(await readPerformanceMessages(user.id, performance.id)).toMatchObject([
    { text: first.text, added: 1, author: "Quest member" },
  ]);

  const stranger = await testUser();
  expect(await listPerformances(stranger.id, questId)).toEqual([]);
  expect(await readPerformanceMessages(stranger.id, performance.id)).toEqual(
    [],
  );
});

test("use_case_api_performance", async () => {
  const {
    user,
    questId,
    lists: [list],
  } = await setup();
  if (list === undefined) {
    throw new Error("The quest has no starting lists");
  }
  const started = await callApi(start, {
    params: { questId },
    body: { riteId: "capture", listId: list.id },
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
  expect(await readListItems(user.id, questId, list.id)).toMatchObject([
    { text: body.text },
  ]);

  expect((await callApi(stop, { params, method: "DELETE" })).body).toEqual({
    data: { id: performanceId },
  });
  expect((await callApi(read, { params })).body).toMatchObject({
    data: { id: performanceId, messages: [{ text: body.text }] },
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
