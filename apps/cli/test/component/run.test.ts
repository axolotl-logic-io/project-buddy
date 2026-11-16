// The CLI's commands as requests to the site, and the site's answers as
// JSONL records and exit statuses.

import { describe, expect, test } from "vitest";
import { EXIT_STATUS } from "../../src/problems.ts";
import { runCli, SESSION } from "./run-test-kit.ts";

const QUEST = "8d2f63c4-5e2b-4a6f-9d61-3b7b0d6a1c11";

const VERSION_LINE = /^project-buddy \d+\.\d+\.\d+\n$/u;
const REQUEST_ID = /^req_[\da-f-]{36}$/u;

const HTTP = {
  badRequest: 400,
  unauthorized: 401,
  notFound: 404,
  conflict: 409,
  tooManyRequests: 429,
  internalServerError: 500,
  badGateway: 502,
} as const;

const QUESTS = [
  { id: "q1", name: "Prototype", status: "active", revision: 0 },
  { id: "q2", name: "Garden", status: "active", revision: 2 },
];

function problem(code: string, status: number, field?: string): Response {
  return Response.json(
    { error: { code, message: `A ${code}.`, retryable: false, field } },
    { status },
  );
}

describe("help", () => {
  test("no arguments shows help and sends nothing", async () => {
    const outcome = await runCli([]);
    expect(outcome.status).toBe(EXIT_STATUS.ok);
    expect(outcome.text).toContain("Usage: project-buddy RESOURCE ACTION");
    expect(outcome.requests).toEqual([]);
  });

  test("a resource shows its commands, and --help a command's usage", async () => {
    const resource = await runCli(["task"]);
    expect(resource.text).toContain("project-buddy task undo CHANGE_VERSION");
    const action = await runCli(["task", "add", "--help"]);
    expect(action.status).toBe(EXIT_STATUS.ok);
    expect(action.text).toContain("Usage: project-buddy task add --quest");
    expect(action.requests).toEqual([]);
  });

  test("--version prints the version", async () => {
    const outcome = await runCli(["--version"]);
    expect(outcome.text).toMatch(VERSION_LINE);
  });
});

describe("records", () => {
  test("a list writes an item per entry, then the count, in sequence", async () => {
    const outcome = await runCli(["quest", "list", "--status", "active"], {
      responses: [Response.json({ items: QUESTS })],
    });
    expect(outcome.status).toBe(EXIT_STATUS.ok);
    const [request] = outcome.requests;
    expect(request?.url.href).toBe(
      "http://site.test/api/v1/quests?status=active",
    );
    expect(request?.cookie).toBe(`session=${SESSION}`);
    const [first] = outcome.records;
    const { requestId } = first ?? {};
    expect(outcome.records).toEqual([
      expect.objectContaining({
        schemaVersion: 1,
        type: "item",
        command: "quest list",
        sequence: 1,
        data: QUESTS[0],
      }),
      expect.objectContaining({ type: "item", sequence: 2, data: QUESTS[1] }),
      expect.objectContaining({
        type: "result",
        sequence: 3,
        count: 2,
        nextCursor: null,
        requestId,
      }),
    ]);
    expect(requestId).toMatch(REQUEST_ID);
  });

  test("an empty list writes only its count, with the list's meta", async () => {
    const outcome = await runCli(["task", "list", "--quest", QUEST], {
      responses: [Response.json({ version: 4, items: [] })],
    });
    expect(outcome.records).toEqual([
      expect.objectContaining({ type: "result", count: 0, version: 4 }),
    ]);
  });

  test("one record writes its data", async () => {
    const me = { id: "u1", name: "Autumn", email: "autumn@example.com" };
    const outcome = await runCli(["whoami"], {
      responses: [Response.json({ data: me })],
    });
    expect(outcome.requests[0]?.url.pathname).toBe("/api/v1/me");
    expect(outcome.records).toEqual([
      expect.objectContaining({ type: "result", command: "whoami", data: me }),
    ]);
  });
});

describe("requests", () => {
  test("options may come before the resource", async () => {
    const outcome = await runCli(["--quest", QUEST, "note", "list"], {
      responses: [Response.json({ items: [] })],
    });
    expect(outcome.status).toBe(EXIT_STATUS.ok);
    expect(outcome.requests[0]?.url.pathname).toBe(
      `/api/v1/quests/${QUEST}/notes`,
    );
  });

  test.each([
    {
      args: [
        "task",
        "add",
        "--quest",
        QUEST,
        "--text",
        "Sketch",
        "--before",
        "2",
      ],
      path: `/api/v1/quests/${QUEST}/tasks`,
      body: { operations: [{ op: "add", text: "Sketch", before: 2 }] },
    },
    {
      args: ["task", "complete", "3", "--quest", QUEST],
      path: `/api/v1/quests/${QUEST}/tasks`,
      body: { operations: [{ op: "complete", step: 3 }] },
    },
    {
      args: ["task", "undo", "7", "--quest", QUEST],
      path: `/api/v1/quests/${QUEST}/tasks/undo`,
      body: { version: 7 },
    },
    {
      args: ["idea", "move", "i1", "--quest", QUEST, "--before", "i0"],
      path: `/api/v1/quests/${QUEST}/ideas`,
      body: { op: "reorder", id: "i1", before: "i0" },
    },
    {
      args: ["idea", "to-tasks", "i1", "--quest", QUEST],
      path: `/api/v1/quests/${QUEST}/ideas`,
      body: { op: "move", id: "i1" },
    },
    {
      args: ["quest", "complete", QUEST, "--revision", "3"],
      path: `/api/v1/quests/${QUEST}/status`,
      body: { status: "completed", revision: 3 },
    },
    {
      args: ["quest", "start", "--from", "make", "--why", "To learn"],
      path: "/api/v1/quests",
      body: { from: "make", why: "To learn" },
    },
    {
      args: ["spell", "cast", "--quest", QUEST, "--spell", "tasks"],
      path: `/api/v1/quests/${QUEST}/conversation/spell`,
      body: { spell: "tasks" },
    },
  ])("$args.0 $args.1 sends its change", async ({ args, path, body }) => {
    const outcome = await runCli(args);
    expect(outcome.status).toBe(EXIT_STATUS.ok);
    const [request] = outcome.requests;
    expect(request?.method).not.toBe("GET");
    expect(request?.url.pathname).toBe(path);
    expect(request?.body).toEqual(body);
  });

  test("an ID goes in the path as one segment", async () => {
    const outcome = await runCli(["note", "remove", "a/b", "--quest", QUEST]);
    expect(outcome.requests[0]?.method).toBe("DELETE");
    expect(outcome.requests[0]?.url.pathname).toBe(
      `/api/v1/quests/${QUEST}/notes/a%2Fb`,
    );
  });

  test("text comes from a file or stdin", async () => {
    const fromFile = await runCli(
      ["note", "add", "--quest", QUEST, "--text-file", "handoff.txt"],
      { files: { "handoff.txt": "Line one\nLine two\n" } },
    );
    expect(fromFile.requests[0]?.body).toEqual({
      text: "Line one\nLine two\n",
    });
    const fromStdin = await runCli(
      ["conversation", "send", "--quest", QUEST, "--stdin"],
      { stdin: "help" },
    );
    expect(fromStdin.requests[0]?.body).toEqual({ text: "help" });
  });
});

describe("invalid input", () => {
  test.each([
    {
      args: ["note", "add", "--quest", QUEST, "--text", "a", "--stdin"],
      field: "text",
    },
    { args: ["note", "add", "--quest", QUEST], field: "text" },
    { args: ["note", "add", "--text", "a"], field: "quest" },
    { args: ["task", "complete", "first", "--quest", QUEST], field: "step" },
    { args: ["task", "complete", "0", "--quest", QUEST], field: "step" },
    { args: ["quest", "list", "--colour"], field: "colour" },
    { args: ["quest", "list", "--quest", QUEST], field: "quest" },
    { args: ["quest", "list", "extra"], field: "argument" },
    { args: ["quest", "fly"], field: "action" },
    { args: ["dragon", "list"], field: "resource" },
    { args: ["quest", "list", "--timeout", "soon"], field: "timeout" },
    {
      args: ["note", "add", "--quest", QUEST, "--text-file", "missing.txt"],
      field: "text-file",
    },
  ])(
    "$args is invalid input naming $field, and sends nothing",
    async ({ args, field }) => {
      const outcome = await runCli(args);
      expect(outcome.status).toBe(EXIT_STATUS.invalidInput);
      expect(outcome.requests).toEqual([]);
      expect(outcome.records).toEqual([
        expect.objectContaining({
          type: "error",
          sequence: 1,
          error: expect.objectContaining({ code: "invalid_input", field }),
        }),
      ]);
    },
  );
});

describe("failures", () => {
  test("no session exits as signed out, without a request", async () => {
    const outcome = await runCli(["quest", "list"], { session: undefined });
    expect(outcome.status).toBe(EXIT_STATUS.authorization);
    expect(outcome.requests).toEqual([]);
    const [{ error } = {}] = outcome.records;
    expect(error).toMatchObject({
      code: "authorization_required",
    });
  });

  test.each([
    {
      response: problem("invalid_input", HTTP.badRequest, "name"),
      status: EXIT_STATUS.invalidInput,
    },
    {
      response: problem("authorization_required", HTTP.unauthorized),
      status: EXIT_STATUS.authorization,
    },
    {
      response: new Response("signed-out", { status: HTTP.unauthorized }),
      status: EXIT_STATUS.authorization,
    },
    {
      response: problem("not_found", HTTP.notFound),
      status: EXIT_STATUS.notFound,
    },
    {
      response: problem("conflict", HTTP.conflict, "revision"),
      status: EXIT_STATUS.conflict,
    },
    {
      response: problem("reply_in_progress", HTTP.conflict),
      status: EXIT_STATUS.conflict,
    },
    {
      response: problem("rate_limited", HTTP.tooManyRequests),
      status: EXIT_STATUS.rateLimited,
    },
    {
      response: problem("reply_failed", HTTP.badGateway),
      status: EXIT_STATUS.failure,
    },
    {
      response: new Response("<html>", { status: HTTP.internalServerError }),
      status: EXIT_STATUS.failure,
    },
  ])(
    "a $response.status answer exits $status",
    async ({ response, status }) => {
      const outcome = await runCli(["quest", "get", QUEST], {
        responses: [response],
      });
      expect(outcome.status).toBe(status);
      expect(outcome.records).toEqual([
        expect.objectContaining({ type: "error", sequence: 1 }),
      ]);
    },
  );

  test("a site it can't reach exits as a network failure", async () => {
    const outcome = await runCli(["quest", "get", QUEST], {
      responses: [new TypeError("fetch failed")],
    });
    expect(outcome.status).toBe(EXIT_STATUS.network);
    const [{ error } = {}] = outcome.records;
    expect(error).toMatchObject({
      code: "network_error",
      retryable: true,
    });
  });
});
