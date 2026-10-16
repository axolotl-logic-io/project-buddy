// @ts-check
// The orchestrator's ledger, runs/<slug>/orchestrator.json (#234): the tokens
// the jobs spent, as increments that survive a job.json being overwritten,
// the hour the rate limit counts, and the jobs the orchestrator started.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { test } from "node:test";

/** @import { Config } from "../src/config.ts" */
/** @import { StatusFile } from "../src/job/status.ts" */

const root = fs.mkdtempSync("/tmp/issue-pipeline-ledger-");
// Environment variables are named by strings, as src/process.ts takes them.
Object.assign(process.env, Object.fromEntries([["ISSUE_PIPELINE_ROOT", root]]));
const { openLedger } = await import("../src/orchestrator/ledger.ts");

/** @type {Config} */
const cfg = {
  account: "bot",
  allowedUsers: ["alice"],
  baseBranch: "integration",
  claimWaitSeconds: [0, 0],
  commands: { test: "true" },
  leaseHours: 3,
  practices: [],
  repo: "o/r",
  slug: "o__r",
};
const START = Date.parse("2026-10-15T10:00:00.000Z");
const MINUTE_MS = 60_000;
const HOUR_MINUTES = 60;
const FIRST_TOKENS = 1000;
const MORE_TOKENS = 500;
const PID = 4242;
const ISSUE = 7;

/** @param {number} minutes @returns {Date} */
function at(minutes) {
  return new Date(START + minutes * MINUTE_MS);
}

// A job.json whose one session spent `input` tokens and as many output ones.
/** @param {number} input @returns {StatusFile} */
function jobWith(input) {
  return {
    version: 1,
    pid: PID,
    issue: ISSUE,
    stage: "spec",
    lane: "orchestrator",
    startedAt: at(0).toISOString(),
    socket: "/tmp/s.sock",
    outcome: null,
    launches: [
      {
        key: "i7-spec-1",
        kind: "session",
        pid: PID,
        session: null,
        startedAt: at(0).toISOString(),
        lastEventAt: null,
        toolFailures: 0,
        usage: { input, output: input, cacheRead: 0, cacheWrite: 0 },
        resumed: false,
        outcome: null,
      },
    ],
  };
}

test("each tick adds only what a launch spent since the last, and a reopened ledger remembers it", () => {
  const ledger = openLedger(cfg);
  ledger.record([jobWith(FIRST_TOKENS)], at(0));
  ledger.record([jobWith(FIRST_TOKENS)], at(1));
  assert.equal(ledger.spentLastHour(at(1)), FIRST_TOKENS * 2);
  ledger.save(at(1));
  const reopened = openLedger(cfg);
  reopened.record([jobWith(FIRST_TOKENS + MORE_TOKENS)], at(2));
  assert.equal(reopened.spentLastHour(at(2)), (FIRST_TOKENS + MORE_TOKENS) * 2);
  // An hour after the first increment only the later one counts.
  assert.equal(reopened.spentLastHour(at(HOUR_MINUTES + 1)), MORE_TOKENS * 2);
});

test("started jobs are kept for an hour, the last one per issue", () => {
  const ledger = openLedger(cfg);
  ledger.launched({
    issue: ISSUE,
    stage: "spec",
    pid: PID,
    at: at(0).toISOString(),
  });
  const later = {
    issue: ISSUE,
    stage: "implement",
    pid: PID,
    at: at(1).toISOString(),
  };
  ledger.launched(later);
  ledger.save(at(1));
  assert.deepEqual(openLedger(cfg).started(), [later]);
  const file = path.join(root, "runs", cfg.slug, "orchestrator.json");
  assert.ok(fs.existsSync(file));
  openLedger(cfg).save(at(HOUR_MINUTES + 2));
  assert.deepEqual(openLedger(cfg).started(), []);
});

test("a launch first seen with no event in the last hour counts nothing, as after a lost ledger", () => {
  fs.rmSync(path.join(root, "runs", cfg.slug, "orchestrator.json"), {
    force: true,
  });
  const old = jobWith(FIRST_TOKENS);
  const [launch] = old.launches;
  assert.ok(launch);
  const twoHoursAgo = at(-2 * HOUR_MINUTES).toISOString();
  /** @type {StatusFile} */
  const finished = {
    ...old,
    startedAt: twoHoursAgo,
    outcome: { kind: "finished" },
    endedAt: twoHoursAgo,
    launches: [
      {
        ...launch,
        startedAt: twoHoursAgo,
        lastEventAt: twoHoursAgo,
        outcome: "ok",
      },
    ],
  };
  const ledger = openLedger(cfg);
  ledger.record([finished], at(0));
  assert.equal(ledger.spentLastHour(at(0)), 0);
  ledger.save(at(0));
  // Its total is remembered, so a later tick doesn't count it either.
  const reopened = openLedger(cfg);
  reopened.record([finished], at(1));
  assert.equal(reopened.spentLastHour(at(1)), 0);
});
