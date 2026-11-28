import { expect, test } from "vitest";
import { GET as getConstruct } from "@/app/api/v1/constructs/[constructId]/route.ts";
import { GET as listConstructs } from "@/app/api/v1/constructs/route.ts";
import {
  POST as change,
  GET as read,
} from "@/app/api/v1/quests/[questId]/lists/[listId]/route.ts";
import { GET as list } from "@/app/api/v1/quests/[questId]/lists/route.ts";
import { GET as listRites } from "@/app/api/v1/rites/route.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { readLists } from "@/lists/list-store.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";
import { callApi, dataOf } from "./api-test-kit.ts";

test("use_case_api_quest_records", async () => {
  const [owner, other] = await Promise.all([testUser(), testUser()]);
  const quest = await testData(owner).quest();
  const [source, destination] = await readLists(owner.id, quest.id);
  if (source === undefined || destination === undefined) {
    throw new Error("Missing starting lists");
  }
  const questId = quest.id;
  const params = { questId, listId: source.id };
  const receiving = { questId, listId: destination.id };
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
  const { listItems } = dataOf(added);
  if (!Array.isArray(listItems)) {
    throw new Error("Missing added list item");
  }
  const [item] = listItems;
  const { id } = item;
  expect(added.body).toMatchObject({
    data: { version: 1, listItems: [{ text: "Mix clay", taskNumber: 1 }] },
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
    data: { listItems: [{ text: "Mix clay" }] },
  });
  expect(
    (
      await callApi(change, {
        params,
        body: { kind: "move", id, destination: destination.id },
      })
    ).body,
  ).toMatchObject({ data: { listItems: [] } });
  expect((await callApi(read, { params: receiving })).body).toMatchObject({
    data: { listItems: [{ id, taskNumber: null }] },
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
