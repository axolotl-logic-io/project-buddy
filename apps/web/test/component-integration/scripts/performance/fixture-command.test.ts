import { spawnSync } from "node:child_process";
import process from "node:process";
import { expect, test } from "vitest";

const IMPORT_DEADLINE_MS = 20_000;
const EMPTY_LINE = /^$/u;
const LOADER_FAILURE =
  /SyntaxError|does not provide an export|ERR_MODULE_NOT_FOUND/u;

test("fixture command loads its kits and refuses missing arguments without leaking a stack", () => {
  // No environment, output path or fixture invocation is supplied. A module
  // loader regression fails before the command can return its safe refusal.
  const result = spawnSync(
    "env",
    [
      "-i",
      process.execPath,
      "--import",
      "tsx",
      "scripts/performance/seed-command.mts",
    ],
    { encoding: "utf8", timeout: IMPORT_DEADLINE_MS },
  );
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(1);
  expect(result.stdout).toBe("");
  expect(result.stderr).not.toMatch(LOADER_FAILURE);
  expect(
    result.stderr.split("\n").filter((line) => !EMPTY_LINE.test(line)),
  ).toHaveLength(1);
});
