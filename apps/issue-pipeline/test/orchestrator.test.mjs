// @ts-check
// The orchestrator's scheduler (#234) on recorded queue snapshots: readers
// run in parallel up to the caps, writers wait on overlapping files, merges
// go in the order of what they unblock, and the rate limit holds every start.
import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeRank } from "../src/orchestrator/queue.ts";
import { schedule } from "../src/orchestrator/schedule.ts";
import {
  CAPPED,
  IMPLEMENTS,
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
} from "./orchestrator-fixtures.mjs";

/** @import { ScheduleSettings, Snapshot } from "../src/orchestrator/queue.ts" */

// Each decision as `#issue stage action reason`, and a merge's queue, in the
// order made.
/** @param {Snapshot} snapshot @param {ScheduleSettings} [settings] @returns {string[]} */
function decided(snapshot, settings = SETTINGS) {
  return schedule(snapshot, settings, NOW).map((decision) => {
    const { issue, stage, action, reason } = decision;
    let queue = "";
    if (decision.action === "started" && decision.mergeQueue !== null) {
      queue = ` queue:${ranked(decision.mergeQueue).join(",")}`;
    }
    return `#${issue} ${stage} ${action} ${reason}${queue}`;
  });
}

/** @param {readonly number[]} numbers @returns {string[]} */
function ranked(numbers) {
  return numbers.map((n) => `#${n}`);
}

test("readers at every reader stage start together, the later stage first", () => {
  assert.deepEqual(decided(READERS), [
    "#5 security started free",
    "#4 accept started free",
    "#3 review started free",
    "#2 spec started free",
    "#1 triage started free",
  ]);
});

test("each decision carries its time, and a reader's start no merge queue", () => {
  const [first] = schedule(READERS, SETTINGS, NOW);
  assert.deepEqual(first, {
    action: "started",
    at: NOW.toISOString(),
    issue: 5,
    stage: "security",
    reason: "free",
    mergeQueue: null,
  });
});

test("a spec beyond its stage cap is held, counting the live spec job", () => {
  assert.deepEqual(decided(SPECS), [
    "#7 spec started free",
    "#8 spec held stage-cap",
  ]);
});

test("starts beyond maxJobs are held at the global cap", () => {
  assert.deepEqual(decided(READERS, CAPPED), [
    "#5 security started free",
    "#4 accept started free",
    "#3 review held global-cap",
    "#2 spec held global-cap",
    "#1 triage held global-cap",
  ]);
});

test("an implement overlapping a live implementation waits; a disjoint one starts", () => {
  assert.deepEqual(decided(IMPLEMENTS), [
    "#10 review started free",
    "#11 implement held files-overlap:#10",
    "#12 implement started free",
  ]);
});

test("a live implementation without st.files holds every implement", () => {
  assert.deepEqual(decided(WHOLE_REPO_LIVE), [
    "#20 review started free",
    "#21 implement held files-overlap:#20",
  ]);
});

test("of two overlapping implements in one tick, the first starts and holds the second", () => {
  assert.deepEqual(decided(TWO_IMPLEMENTS), [
    "#22 implement started free",
    "#23 implement held files-overlap:#22",
  ]);
});

test("two live overlapping issues at fix: the older starts, so neither deadlocks", () => {
  assert.deepEqual(decided(LEGACY_FIXES), [
    "#30 fix started free",
    "#31 fix held files-overlap:#30",
  ]);
});

test("the merge that unblocks the most waiting issues ranks first", () => {
  assert.deepEqual(ranked(mergeRank(MERGES.issues)), ["#40", "#41"]);
  const merges = decided(MERGES).filter((line) => line.includes(" merge "));
  assert.deepEqual(merges, [
    "#40 merge started merge-first queue:#40,#41",
    "#41 merge held merge-order:#40",
  ]);
});

test("merge candidates nothing depends on rank by the lower PR", () => {
  assert.deepEqual(ranked(mergeRank(MERGE_TIE.issues)), ["#51", "#50"]);
  assert.deepEqual(decided(MERGE_TIE), [
    "#50 merge held merge-order:#51",
    "#51 accept started free",
  ]);
});

test("no merge starts while another merge job runs", () => {
  assert.deepEqual(decided(MERGE_LIVE), ["#61 merge held merge-order:#60"]);
});

test("live, stopped, done and skipped issues get no decision; after marks and other lanes hold", () => {
  assert.deepEqual(decided(NO_RUN), [
    "#76 review held lane:L2",
    "#75 triage held after:#70",
    "#77 triage started free",
    "#78 triage started free",
  ]);
});

test("once the last hour's tokens reach the rate limit, every start is held", () => {
  const spent = snapshotOf([...IMPLEMENTS.issues], TOKENS_PER_HOUR);
  assert.deepEqual(decided(spent), [
    "#10 review held rate-limit",
    "#11 implement held files-overlap:#10",
    "#12 implement held rate-limit",
  ]);
  const under = snapshotOf([...IMPLEMENTS.issues], TOKENS_PER_HOUR - 1);
  assert.deepEqual(decided(under), decided(IMPLEMENTS));
});
