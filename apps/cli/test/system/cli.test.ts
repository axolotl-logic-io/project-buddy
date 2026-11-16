// The installed project-buddy command as a process: it reads its site and
// session from the environment and its text from stdin, writes JSONL to
// stdout and exits with its status.

import { afterEach, expect, test } from "vitest";
import { EXIT_STATUS } from "../../src/problems.ts";
import { type FakeSite, runProcess, startSite } from "./cli-test-kit.ts";

const HTTP_OK = 200;
const HTTP_NOT_FOUND = 404;

const QUEST = "8d2f63c4-5e2b-4a6f-9d61-3b7b0d6a1c11";

let site: FakeSite | undefined;

afterEach(async () => {
  await site?.close();
  site = undefined;
});

test("no arguments prints help and succeeds", async () => {
  const outcome = await runProcess([]);
  expect(outcome.status).toBe(EXIT_STATUS.ok);
  expect(outcome.stdout).toContain("Usage: project-buddy RESOURCE ACTION");
  expect(outcome.stderr).toBe("");
});

test("sends the session to the site in the environment, and writes JSONL", async () => {
  site = await startSite({
    status: HTTP_OK,
    body: { version: 2, items: [{ number: 1, text: "Sketch", done: false }] },
  });
  const outcome = await runProcess(["task", "list", "--quest", QUEST], {
    url: site.url,
    session: "cli-session",
  });
  expect(outcome.status).toBe(EXIT_STATUS.ok);
  expect(site.requests).toEqual([
    expect.objectContaining({
      method: "GET",
      url: `/api/v1/quests/${QUEST}/tasks`,
      cookie: "session=cli-session",
    }),
  ]);
  const lines = outcome.stdout.trimEnd().split("\n");
  expect(lines.map((line: string) => JSON.parse(line))).toEqual([
    expect.objectContaining({ type: "item", sequence: 1 }),
    expect.objectContaining({
      type: "result",
      sequence: 2,
      count: 1,
      version: 2,
    }),
  ]);
});

test("reads multiline text from stdin into one request", async () => {
  site = await startSite({ status: HTTP_OK, body: { items: [] } });
  const outcome = await runProcess(
    ["note", "add", "--quest", QUEST, "--stdin"],
    { url: site.url, session: "s" },
    "First line\nSecond line\n",
  );
  expect(outcome.status).toBe(EXIT_STATUS.ok);
  expect(JSON.parse(site.requests[0]?.body ?? "")).toEqual({
    text: "First line\nSecond line\n",
  });
});

test("exits with the status of the site's problem", async () => {
  site = await startSite({
    status: HTTP_NOT_FOUND,
    body: {
      error: {
        code: "not_found",
        message: "No such record.",
        retryable: false,
      },
    },
  });
  const outcome = await runProcess(["quest", "get", QUEST], {
    url: site.url,
    session: "s",
  });
  expect(outcome.status).toBe(EXIT_STATUS.notFound);
  expect(JSON.parse(outcome.stdout)).toMatchObject({
    type: "error",
    error: { code: "not_found" },
  });
});

test("a change past its deadline ends with an unknown outcome", async () => {
  site = await startSite({ hang: true });
  const outcome = await runProcess(
    ["note", "add", "--quest", QUEST, "--text", "Hi", "--timeout", "0.3"],
    { url: site.url, session: "s" },
  );
  expect(outcome.status).toBe(EXIT_STATUS.network);
  expect(JSON.parse(outcome.stdout)).toMatchObject({
    type: "error",
    error: { code: "outcome_unknown", retryable: true },
  });
});
