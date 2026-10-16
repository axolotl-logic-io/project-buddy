// @ts-check
// Recorded queue snapshots for the orchestrator's scheduler (#234), and the
// settings and clock they are scheduled with.

/** @import { ScheduleSettings, Snapshot, SnapshotIssue } from "../src/orchestrator/queue.ts" */

const NOW = new Date("2026-10-15T12:00:00.000Z");
const MINUTE_MS = 60_000;
const FIRST_ISSUE_AT = Date.parse("2026-10-01T00:00:00.000Z");
const ROOMY_JOBS = 10;
const CAPPED_JOBS = 2;
const READER_CAP = 2;
const TOKENS_PER_HOUR = 2_000_000;

/** @type {ScheduleSettings} */
const SETTINGS = {
  maxJobs: ROOMY_JOBS,
  stageCaps: {
    triage: READER_CAP,
    spec: READER_CAP,
    review: READER_CAP,
    accept: READER_CAP,
    security: READER_CAP,
  },
  tokensPerHour: TOKENS_PER_HOUR,
};

/** @type {ScheduleSettings} */
const CAPPED = { ...SETTINGS, maxJobs: CAPPED_JOBS };

// Issue #number, opened `number` minutes after the first: a runnable
// candidate at triage with no files, PR, after mark or job, then `fields`.
/** @param {Partial<SnapshotIssue> & { number: number }} fields @returns {SnapshotIssue} */
function issue(fields) {
  const { number } = fields;
  return {
    createdAt: new Date(FIRST_ISSUE_AT + number * MINUTE_MS).toISOString(),
    verdict: { kind: "candidate", answered: false },
    stage: "triage",
    files: null,
    pr: null,
    after: [],
    stopped: false,
    job: null,
    ...fields,
  };
}

/** @param {SnapshotIssue[]} issues @param {number} [spentLastHour] @returns {Snapshot} */
function snapshotOf(issues, spentLastHour = 0) {
  return { issues, spentLastHour };
}

const LIVE_JOB = { live: true, stage: "implement" };

// One issue at each reader stage.
const READERS = snapshotOf([
  issue({ number: 1, stage: "triage" }),
  issue({ number: 2, stage: "spec" }),
  issue({ number: 3, stage: "review" }),
  issue({ number: 4, stage: "accept" }),
  issue({ number: 5, stage: "security" }),
]);

// Three specs; a spec job already runs for #6.
const SPECS = snapshotOf([
  issue({ number: 6, stage: "spec", job: { live: true, stage: "spec" } }),
  issue({ number: 7, stage: "spec" }),
  issue({ number: 8, stage: "spec" }),
]);

// #10 is in review over src/a/**; #11 and #12 wait to implement.
const IMPLEMENTS = snapshotOf([
  issue({ number: 10, stage: "review", files: ["src/a/**"] }),
  issue({ number: 11, stage: "implement", files: ["src/a/b.ts"] }),
  issue({ number: 12, stage: "implement", files: ["docs/x.md"] }),
]);

// #20 is in review with no files, so it holds every implement.
const WHOLE_REPO_LIVE = snapshotOf([
  issue({ number: 20, stage: "review", files: null }),
  issue({ number: 21, stage: "implement", files: ["docs/x.md"] }),
]);

// Two implements in one tick: #22 takes the whole repo, #23 touches docs.
const TWO_IMPLEMENTS = snapshotOf([
  issue({ number: 22, stage: "implement", files: [] }),
  issue({ number: 23, stage: "implement", files: ["docs/x.md"] }),
]);

// Two live issues from before st.files, both at fix.
const LEGACY_FIXES = snapshotOf([
  issue({ number: 31, stage: "fix" }),
  issue({ number: 30, stage: "fix" }),
]);

// #40 and #41 are at merge; #42 comes after #40 and #43 touches its files.
const MERGE_FIRST = 40;
const MERGES = snapshotOf([
  issue({ number: MERGE_FIRST, stage: "merge", pr: 100, files: ["src/x.ts"] }),
  issue({ number: 41, stage: "merge", pr: 90, files: ["lib/y.ts"] }),
  issue({
    number: 42,
    stage: "spec",
    files: ["docs/z.md"],
    after: [MERGE_FIRST],
  }),
  issue({ number: 43, stage: "triage", files: ["src/**"] }),
]);

// Nothing depends on either merge candidate.
const MERGE_TIE = snapshotOf([
  issue({ number: 50, stage: "merge", pr: 80, files: ["a.ts"] }),
  issue({ number: 51, stage: "accept", pr: 70, files: ["b.ts"] }),
]);

// #60's merge job runs; #61 waits at merge.
const MERGE_LIVE = snapshotOf([
  issue({
    number: 60,
    stage: "merge",
    pr: 10,
    job: { live: true, stage: "merge" },
  }),
  issue({ number: 61, stage: "merge", pr: 20 }),
]);

// Issues that get no decision, or a hold from their classify verdict.
const LIVE_IMPLEMENT = 70;
const NO_RUN = snapshotOf([
  issue({
    number: LIVE_IMPLEMENT,
    stage: "implement",
    job: LIVE_JOB,
    files: ["x/**"],
  }),
  issue({ number: 71, stage: "stopped" }),
  issue({ number: 72, stage: "review", stopped: true }),
  issue({ number: 73, stage: "done" }),
  issue({ number: 74, verdict: { kind: "skip" } }),
  issue({
    number: 75,
    verdict: { kind: "waiting-on-after" },
    after: [LIVE_IMPLEMENT],
  }),
  issue({
    number: 76,
    verdict: { kind: "live-elsewhere", lane: "L2" },
    stage: "review",
  }),
  issue({
    number: 77,
    verdict: { kind: "candidate", answered: true },
    stage: "spec",
  }),
  issue({ number: 78, stage: null }),
]);

export {
  CAPPED,
  IMPLEMENTS,
  issue,
  LEGACY_FIXES,
  MERGE_LIVE,
  MERGE_TIE,
  MERGES,
  NO_RUN,
  NOW,
  READERS,
  SETTINGS,
  SPECS,
  snapshotOf,
  TOKENS_PER_HOUR,
  TWO_IMPLEMENTS,
  WHOLE_REPO_LIVE,
};
