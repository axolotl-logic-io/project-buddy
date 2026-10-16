// @ts-check
// The watchdog's repeated-failures rule (#235): a running session whose
// calls of one tool failed failureStreak times in a row is steered once with
// the last error and a hint to read it, at the threshold and not before, and
// once more only for a new streak.
import assert from "node:assert/strict";
import { test } from "node:test";
import { loggedFor, tickOver } from "./orchestrator-watchdog-test-kit.mjs";
import { OTHERS_PID, writeJob } from "./orchestrator-world-test-kit.mjs";

const ISSUE = 70;
const AGAIN = 71;
// The default, which the kit's config leaves to the watchdog.
const FAILURE_STREAK = 3;
const ERROR = "ENOENT: no such file or directory, open 'src/missing.ts'";
const ISSUES = [{ number: ISSUE, state: { stage: "implement" } }];
const KEY = `i${ISSUE}-implement-1`;
const READ_THE_ERROR = /read (?:that|the) error/iu;

/** @param {number} count @param {number} [issue] @returns {void} */
function failedTimes(count, issue = ISSUE) {
  const failures = { count, tool: "read", error: ERROR };
  writeJob({ issue, stage: "implement", pid: OTHERS_PID, failures });
}

test("failureStreak failed calls of one tool steer the session once with the last error and a hint to read it", () => {
  failedTimes(FAILURE_STREAK - 1);
  assert.deepEqual(tickOver(ISSUES).steered, []);
  failedTimes(FAILURE_STREAK);
  const { steered } = tickOver(ISSUES);
  assert.equal(steered.length, 1);
  const [, key = "", message = ""] = steered[0] ?? [];
  assert.equal(key, KEY);
  assert.ok(message.includes(ERROR));
  assert.ok(message.includes("read"));
  assert.match(message, READ_THE_ERROR);
  failedTimes(FAILURE_STREAK + 1);
  assert.deepEqual(tickOver(ISSUES).steered, []);
  assert.deepEqual(
    loggedFor(ISSUE).map(({ action, reason }) => `${action} ${reason}`),
    [`steered failures:${KEY}`],
  );
});

test("a new streak after a success is steered again when it reaches failureStreak", () => {
  const issues = [{ number: AGAIN, state: { stage: "implement" } }];
  failedTimes(FAILURE_STREAK, AGAIN);
  assert.equal(tickOver(issues).steered.length, 1);
  failedTimes(0, AGAIN);
  assert.deepEqual(tickOver(issues).steered, []);
  failedTimes(FAILURE_STREAK, AGAIN);
  assert.equal(tickOver(issues).steered.length, 1);
});
