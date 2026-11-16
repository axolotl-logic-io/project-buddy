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
import { callApi, dataOf } from "./api-test-kit.ts";

describe("use_case_cli_api_quests", () => {
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

  test("whoami names the signed-in user", async () => {
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
    const chat = await herData.chat(quest);
    await signIn(her);

    const listed = await callApi(listQuests, {
      params: {},
      query: "status=active",
    });
    expect(listed.body).toEqual({
      items: [expect.objectContaining({ id: quest.id, name: "Prototype" })],
    });

    const read = await callApi(getQuest, { params: { questId: quest.id } });
    expect(read.body).toEqual({
      data: expect.objectContaining({
        id: quest.id,
        status: "active",
        revision: 0,
        conversationId: chat.id,
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
    ).toEqual({ items: [] });
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
      items: [],
    });
  });

  test("starting from a starting point opens a quest, and Dailies resumes", async () => {
    const { her } = await twoUsers();
    await signIn(her);
    const made = await callApi(startQuest, {
      params: {},
      body: { from: "make", why: "Build the first prototype" },
    });
    expect(made.body).toEqual({
      data: expect.objectContaining({
        name: "Make a thing",
        status: "active",
        resumed: false,
        conversationId: expect.any(String),
      }),
    });

    const first = await callApi(startQuest, {
      params: {},
      body: { from: "dailies" },
    });
    const again = await callApi(startQuest, {
      params: {},
      body: { from: "dailies" },
    });
    expect(dataOf(first)).toMatchObject({ dailies: true, resumed: false });
    const { id } = dataOf(first);
    expect(dataOf(again)).toMatchObject({
      id,
      resumed: true,
    });

    const invalid = await callApi(startQuest, {
      params: {},
      body: { from: "fly" },
    });
    expect(invalid).toMatchObject({
      status: HTTP_STATUS.badRequest,
      body: { error: { code: "invalid_input", field: "from" } },
    });
  });
});
