import { describe, expect, test } from "vitest";
import { GET as getMe } from "@/app/api/v1/me/route.ts";
import {
  GET as getQuest,
  PATCH as renameQuest,
} from "@/app/api/v1/quests/[questId]/route.ts";
import { POST as changeStatus } from "@/app/api/v1/quests/[questId]/status/route.ts";
import {
  GET as listQuests,
  POST as startQuest,
} from "@/app/api/v1/quests/route.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { signIn, signOut } from "../test-database/session-test-kit.ts";
import { twoUsers } from "../test-database/two-users-test-kit.ts";
import { callApi, dataOf, itemsOf } from "./api-test-kit.ts";

describe("use_case_api_quests", () => {
  test("a request without a session answers 401 with a problem, never a redirect", async () => {
    signOut();
    const answer = await callApi(listQuests, { params: {} });
    expect(answer).toEqual({
      status: HTTP_STATUS.unauthorized,
      body: {
        error: expect.objectContaining({
          code: "authorization_required",
          retryable: false,
        }),
      },
    });
  });

  test("me names the signed-in user", async () => {
    const { her } = await twoUsers();
    await signIn(her);
    const answer = await callApi(getMe, { params: {} });
    expect(answer.body).toEqual({
      data: { id: her.id, name: her.name ?? null, email: her.email },
    });
  });

  test("the owner lists, reads, renames and completes a quest with its revision", async () => {
    const { her, herData } = await twoUsers();
    const quest = await herData.quest("Prototype");
    await signIn(her);

    const listed = await callApi(listQuests, {
      params: {},
      query: "status=active",
    });
    expect(listed.body).toEqual({
      items: [
        expect.objectContaining({ name: "Life", life: true }),
        expect.objectContaining({
          id: quest.id,
          name: "Prototype",
          life: false,
        }),
      ],
    });

    const read = await callApi(getQuest, { params: { questId: quest.id } });
    expect(read.body).toEqual({
      data: expect.objectContaining({
        id: quest.id,
        status: "active",
        revision: 0,
      }),
    });

    const renamed = await callApi(renameQuest, {
      params: { questId: quest.id },
      method: "PATCH",
      body: { name: "  First prototype " },
    });
    expect(renamed.body).toEqual({
      data: expect.objectContaining({ name: "First prototype" }),
    });

    const unnamed = await callApi(renameQuest, {
      params: { questId: quest.id },
      method: "PATCH",
      body: { name: " " },
    });
    expect(unnamed).toMatchObject({
      status: HTTP_STATUS.badRequest,
      body: { error: { code: "invalid_input", field: "name" } },
    });

    const completed = await callApi(changeStatus, {
      params: { questId: quest.id },
      body: { status: "completed", revision: 0 },
    });
    expect(completed.body).toEqual({
      data: expect.objectContaining({ status: "completed", revision: 1 }),
    });

    const stale = await callApi(changeStatus, {
      params: { questId: quest.id },
      body: { status: "active", revision: 0 },
    });
    expect(stale).toMatchObject({
      status: HTTP_STATUS.conflict,
      body: { error: { code: "conflict", retryable: false } },
    });
    expect(
      (await callApi(listQuests, { params: {}, query: "status=active" })).body,
    ).toEqual({ items: [expect.objectContaining({ name: "Life" })] });
  });

  test("another user's quest is not found, whatever the request", async () => {
    const { herData, other } = await twoUsers();
    const quest = await herData.quest("Hers");
    await signIn(other);
    const params = { questId: quest.id };
    const answers = await Promise.all([
      callApi(getQuest, { params }),
      callApi(renameQuest, { params, method: "PATCH", body: { name: "Mine" } }),
      callApi(changeStatus, {
        params,
        body: { status: "abandoned", revision: 0 },
      }),
      callApi(getQuest, { params: { questId: "not-a-quest" } }),
    ]);
    for (const answer of answers) {
      expect(answer).toMatchObject({
        status: HTTP_STATUS.notFound,
        body: { error: { code: "not_found" } },
      });
    }
    expect((await callApi(listQuests, { params: {} })).body).toEqual({
      items: [expect.objectContaining({ name: "Life", life: true })],
    });
  });

  test("listing makes their one Life, and listing again makes no other", async () => {
    const { her } = await twoUsers();
    await signIn(her);

    const first = await callApi(listQuests, { params: {} });
    const again = await callApi(listQuests, { params: {} });

    expect(first.body).toEqual({
      items: [expect.objectContaining({ name: "Life", life: true })],
    });
    expect(again.body).toEqual(first.body);
  });

  test("a Life refuses to be completed", async () => {
    const { her } = await twoUsers();
    await signIn(her);
    const listed = await callApi(listQuests, { params: {} });
    const [life] = itemsOf(listed);
    const { id: questId } = life ?? {};
    if (typeof questId !== "string") {
      throw new Error("No Life was made");
    }

    const completed = await callApi(changeStatus, {
      params: { questId },
      body: { status: "completed", revision: 0 },
    });

    expect(completed.status).not.toBe(HTTP_STATUS.ok);
    expect((await callApi(getQuest, { params: { questId } })).body).toEqual({
      data: expect.objectContaining({ status: "active" }),
    });
  });

  test("each start opens a new quest with its name and Why", async () => {
    const { her } = await twoUsers();
    await signIn(her);
    const body = { name: "Prototype", why: "  Build the first one " };

    const first = await callApi(startQuest, { params: {}, body });
    const again = await callApi(startQuest, { params: {}, body });

    expect(first.body).toEqual({
      data: expect.objectContaining({
        name: "Prototype",
        status: "active",
        life: false,
      }),
    });
    const { id } = dataOf(first);
    expect(dataOf(again)).not.toMatchObject({ id });

    const unnamed = await callApi(startQuest, {
      params: {},
      body: { why: "No name" },
    });
    expect(unnamed).toMatchObject({
      status: HTTP_STATUS.badRequest,
      body: { error: { code: "invalid_input", field: "name" } },
    });
  });
});
