// @ts-check
// The usage report (#302, src/report/usage.ts): nearest-rank spreads per
// role, state and model, the four flags, each role's top tools, and the
// records it leaves out: another account's comments and records before
// --since.
import assert from "node:assert/strict";
import { test } from "node:test";
import { COMMENT } from "../src/comments.ts";
import { usageBody } from "../src/job/usage-comment.ts";
import { serializeUsage } from "../src/job/usage-log.ts";
import { usageReport } from "../src/report/usage.ts";
import { githubComment } from "./fake-gh.mjs";
import { sessionRecord } from "./usage-fixtures.mjs";

/** @import { IssueComment } from "../src/comments.ts" */
/** @import { ReportOptions, UsageFlags } from "../src/report/usage.ts" */

const ACCOUNT = "a";
const ISSUE = 7;
const COMMENT_ID = 41;
const START = Date.parse("2026-10-16T12:00:00.000Z");
const MINUTE = 60_000;
const CREATED = "2026-10-16T13:00:00Z";
/** @type {ReportOptions} */
const OPTIONS = { account: ACCOUNT, role: null, issue: null, since: null };
/** @type {UsageFlags} */
const FLAGS = { firstContext: 40_000, toolOutputShare: 0.25 };

// The fixture session's context: its first turn, peak and last turn, under
// the soft limit of 150,000 tokens.
const FIRST = 1200;
const PEAK = 5300;
const AT_FINISH = 5000;

/** @param {number} minute @returns {string} a record time, `minute`s on */
function atOf(minute) {
  return new Date(START + minute * MINUTE).toISOString();
}

/**
 * The fixture session's context, with `first` and `peak` replaced.
 * @param {{ first?: number, peak?: number }} over
 * @returns {object}
 */
function contextWith({ first = FIRST, peak = PEAK }) {
  return {
    first,
    peak,
    atFinish: AT_FINISH,
    soft: 150_000,
    hard: 175_000,
    window: null,
    steered: false,
  };
}

/**
 * A session record's line, at `minute`, with `over` on top.
 * @param {number} minute
 * @param {Record<string, unknown>} [over]
 * @returns {string}
 */
function lineAt(minute, over = {}) {
  return serializeUsage(sessionRecord({ at: atOf(minute), ...over }));
}

/**
 * Session record lines, a minute apart, each with its `over` on top.
 * @param {readonly Record<string, unknown>[]} overs
 * @returns {string[]}
 */
function linesOf(overs) {
  return overs.map((over, minute) => lineAt(minute, over));
}

/**
 * A usage comment holding `lines`, as listComments parses it.
 * @param {readonly string[]} lines
 * @param {string} [login]
 * @returns {IssueComment}
 */
function usageComment(lines, login = ACCOUNT) {
  const body = usageBody(ISSUE, 1, lines);
  return COMMENT.parse(
    githubComment({ id: COMMENT_ID, body, login, created: CREATED }),
  );
}

// Ten peaks, 1000 to 10000, out of order: step 3 through the ten ranks.
const SESSIONS = 10;
const STRIDE = 3;
const THOUSAND = 1000;
const PEAKS = Array.from(
  { length: SESSIONS },
  (_, i) => (((i * STRIDE) % SESSIONS) + 1) * THOUSAND,
);

test("the spreads are by nearest rank: median 5000, p90 9000, max 10000 of ten", () => {
  const lines = linesOf(
    PEAKS.map((peak) => ({ context: contextWith({ peak }) })),
  );
  const { groups } = usageReport([usageComment(lines)], OPTIONS, FLAGS);
  assert.equal(groups.length, 1);
  const [group] = groups;
  assert.equal(group?.count, PEAKS.length);
  assert.deepEqual(group?.peak, { median: 5000, p90: 9000, max: 10_000 });
});

test("each flag is raised by the session that crosses it, and only that one", () => {
  const lines = linesOf([
    { state: "calm" },
    { state: "first", context: contextWith({ first: 41_000, peak: 50_000 }) },
    { state: "soft", context: contextWith({ peak: 160_000 }) },
    { state: "tools", largestToolOutput: { tool: "read", chars: 2000 } },
    { state: "work", attempt: 1 },
    { state: "work", attempt: 2, context: contextWith({ first: 2000 }) },
  ]);
  const { flagged } = usageReport([usageComment(lines)], OPTIONS, FLAGS);
  assert.deepEqual(
    flagged.map(({ state, attempt, reasons }) => ({ state, attempt, reasons })),
    [
      { state: "first", attempt: 1, reasons: ["first-context"] },
      { state: "soft", attempt: 1, reasons: ["past-soft"] },
      { state: "tools", attempt: 1, reasons: ["tool-output"] },
      { state: "work", attempt: 2, reasons: ["first-grew"] },
    ],
  );
});

test("another account's marked comment adds to no group and no flag", () => {
  const mine = usageComment([lineAt(0)]);
  const forged = usageComment(
    [lineAt(1, { context: contextWith({ first: 41_000, peak: 160_000 }) })],
    "mallory",
  );
  const report = usageReport([mine, forged], OPTIONS, FLAGS);
  assert.deepEqual(report, usageReport([mine], OPTIONS, FLAGS));
  assert.equal(report.groups[0]?.count, 1);
  assert.deepEqual(report.flagged, []);
});

test("a record from before --since is left out", () => {
  const since = atOf(1);
  const lines = linesOf([{ context: contextWith({ peak: 160_000 }) }, {}]);
  const report = usageReport(
    [usageComment(lines)],
    { ...OPTIONS, since },
    FLAGS,
  );
  assert.equal(report.groups[0]?.count, 1);
  assert.equal(report.groups[0]?.peak.max, PEAK);
  assert.deepEqual(report.flagged, []);
});

test("each role lists the five tools with the most output", () => {
  const lines = linesOf([
    {
      tools: {
        read: { calls: 1, outputChars: 600 },
        bash: { calls: 1, outputChars: 500 },
        grep: { calls: 1, outputChars: 400 },
        edit: { calls: 1, outputChars: 300 },
        write: { calls: 1, outputChars: 200 },
        find: { calls: 1, outputChars: 100 },
      },
    },
    { tools: { find: { calls: 1, outputChars: 650 } } },
  ]);
  const { tools } = usageReport([usageComment(lines)], OPTIONS, FLAGS);
  assert.deepEqual(tools, [
    {
      role: "spec-writer",
      top: [
        { tool: "find", calls: 2, outputChars: 750 },
        { tool: "read", calls: 1, outputChars: 600 },
        { tool: "bash", calls: 1, outputChars: 500 },
        { tool: "grep", calls: 1, outputChars: 400 },
        { tool: "edit", calls: 1, outputChars: 300 },
      ],
    },
  ]);
});
