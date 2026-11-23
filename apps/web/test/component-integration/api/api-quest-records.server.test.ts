import { expect, test, vi } from "vitest";
import { GET as getConstruct } from "@/app/api/v1/constructs/[constructId]/route.ts";
import { GET as listConstructs } from "@/app/api/v1/constructs/route.ts";
import {
  POST as change,
  GET as read,
} from "@/app/api/v1/quests/[questId]/spaces/[spaceId]/route.ts";
import { GET as list } from "@/app/api/v1/quests/[questId]/spaces/route.ts";
import { GET as listRites } from "@/app/api/v1/rites/route.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { listSpaces } from "@/spaces/space-store.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";
import { callApi, dataOf } from "./api-test-kit.ts";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));

test("use_case_api_quest_records", async () => {
  const [owner, other] = await Promise.all([testUser(), testUser()]);
  const quest = await testData(owner).quest();
  const [source, destination] = await listSpaces(owner.id, quest.id);
  if (source === undefined || destination === undefined) {
    throw new Error("Missing starting spaces");
  }
  const questId = quest.id;
  const params = { questId, spaceId: source.id };
  const receiving = { questId, spaceId: destination.id };
  await signIn(owner);
  expect((await callApi(list, { params: { questId } })).body).toMatchObject({
    items: [
      { id: source.id, version: 0 },
      { id: destination.id, version: 0 },
    ],
  });
  const added = await callApi(change, {
    params,
    body: { kind: "add", text: "Mix clay" },
  });
  const { murmlings } = dataOf(added);
  if (!Array.isArray(murmlings)) {
    throw new Error("Missing added murmling");
  }
  const [item] = murmlings;
  const { id } = item;
  expect(added.body).toMatchObject({
    data: { version: 1, murmlings: [{ text: "Mix clay", taskNumber: 1 }] },
  });
  const edited = await callApi(change, {
    params,
    body: { kind: "edit", id, text: "Glaze clay" },
  });
  const { version } = dataOf(edited);
  const undone = await callApi(change, {
    params,
    body: { kind: "undo", version },
  });
  expect(undone.body).toMatchObject({
    data: { murmlings: [{ text: "Mix clay" }] },
  });
  expect(
    (
      await callApi(change, {
        params,
        body: { kind: "move", id, destination: destination.id },
      })
    ).body,
  ).toMatchObject({ data: { murmlings: [] } });
  expect((await callApi(read, { params: receiving })).body).toMatchObject({
    data: { murmlings: [{ id, taskNumber: 1, type: "task" }] },
  });
  expect((await callApi(listRites, { params: {} })).body).toMatchObject({
    items: expect.arrayContaining([expect.objectContaining({ id: "capture" })]),
  });
  expect((await callApi(listConstructs, { params: {} })).body).toMatchObject({
    items: expect.arrayContaining([expect.objectContaining({ id: "lumen" })]),
  });
  expect(
    (await callApi(getConstruct, { params: { constructId: "lumen" } })).status,
  ).toBe(HTTP_STATUS.ok);
  await signIn(other);
  expect((await callApi(read, { params })).status).toBe(HTTP_STATUS.notFound);
});
