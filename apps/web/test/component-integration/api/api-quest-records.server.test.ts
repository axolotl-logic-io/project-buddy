import { describe, expect, test } from "vitest";
import { GET as getConstruct } from "@/app/api/v1/constructs/[constructId]/route.ts";
import { GET as listConstructs } from "@/app/api/v1/constructs/route.ts";
import {
  PATCH as editMilestone,
  DELETE as removeMilestone,
} from "@/app/api/v1/milestones/[milestoneId]/route.ts";
import {
  POST as changeIdeas,
  GET as listIdeas,
} from "@/app/api/v1/quests/[questId]/ideas/route.ts";
import { GET as listMilestones } from "@/app/api/v1/quests/[questId]/milestones/route.ts";
import { DELETE as removeNote } from "@/app/api/v1/quests/[questId]/notes/[noteId]/route.ts";
import {
  POST as addNote,
  GET as listNotes,
} from "@/app/api/v1/quests/[questId]/notes/route.ts";
import {
  POST as changeTasks,
  GET as listTasks,
} from "@/app/api/v1/quests/[questId]/tasks/route.ts";
import { POST as undoTasks } from "@/app/api/v1/quests/[questId]/tasks/undo/route.ts";
import { GET as getSpell } from "@/app/api/v1/spells/[spellId]/route.ts";
import { GET as listSpells } from "@/app/api/v1/spells/route.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { recordMilestone } from "@/milestones/milestone-store.ts";
import { changeQuestStatus } from "@/quests/quest-status-store.ts";
import { signIn } from "../test-database/session-test-kit.ts";
import { twoUsers } from "../test-database/two-users-test-kit.ts";
import { callApi, dataOf, firstItemId } from "./api-test-kit.ts";

describe("use_case_cli_api_quest_records", () => {
  test("Tasks change by step number, report the version and undo", async () => {
    const { her, herData } = await twoUsers();
    const quest = await herData.quest();
    await signIn(her);
    const params = { questId: quest.id };

    const added = await callApi(changeTasks, {
      params,
      body: {
        operations: [
          { op: "add", text: "Outline the prototype" },
          { op: "add", text: "Draw it" },
        ],
      },
    });
    expect(added.body).toMatchObject({
      version: 1,
      items: [
        { number: 1, text: "Outline the prototype", done: false },
        { number: 2, text: "Draw it", done: false },
      ],
    });

    await callApi(changeTasks, {
      params,
      body: { operations: [{ op: "complete", step: 1 }] },
    });
    expect((await callApi(listTasks, { params })).body).toEqual({
      version: 2,
      items: [
        { number: 1, text: "Outline the prototype", done: true },
        { number: 2, text: "Draw it", done: false },
      ],
    });

    const undone = await callApi(undoTasks, { params, body: { version: 2 } });
    expect(undone.body).toMatchObject({
      version: 3,
      items: [{ number: 1, done: false }, { number: 2 }],
    });
    const again = await callApi(undoTasks, { params, body: { version: 2 } });
    expect(again).toMatchObject({
      status: HTTP_STATUS.conflict,
      body: { error: { code: "conflict" } },
    });

    const missing = await callApi(changeTasks, {
      params,
      body: { operations: [{ op: "remove", step: 9 }] },
    });
    expect(missing).toMatchObject({
      status: HTTP_STATUS.notFound,
      body: { error: { code: "not_found", field: "step" } },
    });

    const invalid = await callApi(changeTasks, {
      params,
      body: { operations: [] },
    });
    expect(invalid).toMatchObject({
      status: HTTP_STATUS.badRequest,
      body: { error: { code: "invalid_input", field: "operations" } },
    });
  });

  test("Ideas add, move to Tasks and report a missing idea", async () => {
    const { her, herData } = await twoUsers();
    const quest = await herData.quest();
    await signIn(her);
    const params = { questId: quest.id };

    const added = await callApi(changeIdeas, {
      params,
      body: { op: "add", text: "Try watercolours" },
    });
    expect(added.body).toEqual({
      items: [{ id: expect.any(String), text: "Try watercolours" }],
    });
    const ideaId = firstItemId(await callApi(listIdeas, { params }));
    const moved = await callApi(changeIdeas, {
      params,
      body: { op: "move", id: ideaId },
    });
    expect(moved.body).toEqual({ items: [] });
    expect((await callApi(listTasks, { params })).body).toMatchObject({
      items: [{ text: "Try watercolours" }],
    });

    const gone = await callApi(changeIdeas, {
      params,
      body: { op: "remove", id: ideaId },
    });
    expect(gone).toMatchObject({
      status: HTTP_STATUS.notFound,
      body: { error: { code: "not_found" } },
    });
  });

  test("Quick Notes save only to an Active quest, and deletes are idempotent", async () => {
    const { her, herData } = await twoUsers();
    const quest = await herData.quest();
    await signIn(her);
    const params = { questId: quest.id };

    const empty = await callApi(addNote, { params, body: { text: "  " } });
    expect(empty).toMatchObject({
      status: HTTP_STATUS.badRequest,
      body: { error: { code: "invalid_input", field: "text" } },
    });
    const saved = await callApi(addNote, {
      params,
      body: { text: "Line one\nLine two" },
    });
    expect(saved.body).toEqual({
      items: [
        {
          id: expect.any(String),
          text: "Line one\nLine two",
          savedAt: expect.any(String),
        },
      ],
    });
    const noteParams = { ...params, noteId: firstItemId(saved) };
    expect((await callApi(removeNote, { params: noteParams })).body).toEqual({
      items: [],
    });
    expect((await callApi(removeNote, { params: noteParams })).status).toBe(
      HTTP_STATUS.ok,
    );
    expect((await callApi(listNotes, { params })).body).toEqual({ items: [] });

    await changeQuestStatus(her.id, {
      questId: quest.id,
      fromStatus: "active",
      toStatus: "completed",
      revision: 0,
    });
    const closed = await callApi(addNote, { params, body: { text: "Late" } });
    expect(closed).toMatchObject({
      status: HTTP_STATUS.conflict,
      body: { error: { code: "conflict" } },
    });
  });

  test("milestones list by quest and change by id, for their owner only", async () => {
    const { her, herData, other } = await twoUsers();
    const quest = await herData.quest();
    const chat = await herData.chat(quest);
    const milestone = await recordMilestone(
      her.id,
      { questId: quest.id, chatId: chat.id },
      "Drew the first sketch",
    );
    const milestoneParams = { milestoneId: milestone?.id ?? "" };
    await signIn(other);
    expect(
      (
        await callApi(editMilestone, {
          params: milestoneParams,
          method: "PATCH",
          body: { text: "Mine now" },
        })
      ).status,
    ).toBe(HTTP_STATUS.notFound);

    await signIn(her);
    const edited = await callApi(editMilestone, {
      params: milestoneParams,
      method: "PATCH",
      body: { text: "Drew two sketches" },
    });
    expect(dataOf(edited)).toEqual({
      id: milestone?.id,
      text: "Drew two sketches",
    });
    expect(
      (await callApi(listMilestones, { params: { questId: quest.id } })).body,
    ).toMatchObject({ items: [{ text: "Drew two sketches" }] });
    await callApi(removeMilestone, {
      params: milestoneParams,
      method: "DELETE",
    });
    expect(
      (await callApi(listMilestones, { params: { questId: quest.id } })).body,
    ).toEqual({ items: [] });
  });

  test("constructs and spells list the built-ins and get by id", async () => {
    const { her } = await twoUsers();
    await signIn(her);
    expect((await callApi(listConstructs, { params: {} })).body).toMatchObject({
      items: expect.arrayContaining([
        expect.objectContaining({ id: "vellum", builtIn: true }),
      ]),
    });
    expect(
      dataOf(await callApi(getConstruct, { params: { constructId: "lumen" } })),
    ).toMatchObject({ id: "lumen", builtIn: true });
    expect(
      (await callApi(getConstruct, { params: { constructId: "nobody" } }))
        .status,
    ).toBe(HTTP_STATUS.notFound);
    expect((await callApi(listSpells, { params: {} })).body).toEqual({
      items: [
        { id: "tasks", name: "Tasks", destination: "tasks", builtIn: true },
        {
          id: "brainstorm",
          name: "Brainstorm",
          destination: "brainstorm",
          builtIn: true,
        },
      ],
    });
    expect(
      dataOf(await callApi(getSpell, { params: { spellId: "tasks" } })),
    ).toMatchObject({ id: "tasks" });
  });
});
