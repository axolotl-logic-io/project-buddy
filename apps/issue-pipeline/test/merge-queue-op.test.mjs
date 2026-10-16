// @ts-check
// The merge op with the orchestrator's ranked merge queue (#234): only a
// ready issue ahead of this one in the queue holds its merge, in place of
// the lowest-PR order.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ask,
  calls,
  fakeGh,
  finishReplies,
  hoursFromNow,
  LANE,
  listCall,
  replyLine,
  SWEEP,
  stateListing,
  world,
} from "./ops-test-kit.mjs";

/** @import { GhReply } from "./fake-gh.mjs" */
/** @import { World } from "./ops-test-kit.mjs" */

const ISSUE = 7;
const PR = 50;
const CLOSED = 12;
const STOPPED = 9;
const UNREADY = 11;
const BEHIND = 13;
const ORDER_CALLS = 3;
const OPEN_ARGS =
  "issue list -R o/r --state open --limit 100 --json number,labels".split(" ");
const VIEW_ARGS = [
  ..."pr view 50 -R o/r --json".split(" "),
  "headRefOid,state,mergeable,mergeStateStatus,isDraft",
];
const STATE = {
  pr: PR,
  stage: "merge",
  lease: { lane: LANE, sweepId: SWEEP, at: hoursFromNow(0) },
};

/** @param {string} sha @returns {GhReply} */
function viewReply(sha) {
  const view = {
    headRefOid: sha,
    state: "OPEN",
    mergeable: "MERGEABLE",
    mergeStateStatus: "CLEAN",
    isDraft: false,
  };
  return { when: "pr view", stdout: JSON.stringify(view) };
}

/** @param {object[]} open @returns {GhReply} */
function openListing(open) {
  return { when: "issue list", stdout: JSON.stringify(open) };
}

// Merges #7 with merge order and `queue`, after queuing `replies`.
/** @param {World} w @param {number[]} queue @param {GhReply[]} replies @returns {string} */
function queuedMerge(w, queue, replies) {
  fakeGh.reply([viewReply(w.sha), ...replies]);
  return ask(w, {
    op: "merge",
    number: ISSUE,
    state: STATE,
    expectedSha: w.sha,
    summary: "All good.",
    mergeOrder: true,
    mergeQueue: queue,
  });
}

test("a ready issue ahead in the merge queue holds the merge, whatever its PR", () => {
  const w = world();
  const out = queuedMerge(
    w,
    [UNREADY, ISSUE],
    [
      openListing([{ number: UNREADY, labels: [] }]),
      stateListing(UNREADY, { pr: 60, stage: "accept" }),
    ],
  );
  assert.equal(
    out,
    replyLine({
      ok: true,
      op: "merge",
      posted: 0,
      merged: false,
      reason: "queued",
      waitingFor: UNREADY,
      waitingForPr: 60,
    }),
  );
  assert.deepEqual(calls().slice(0, 2), [VIEW_ARGS, OPEN_ARGS]);
});

test("closed, stopped and unready issues ahead, and older PRs behind, don't hold it", () => {
  const w = world();
  const open = [
    { number: STOPPED, labels: [{ name: "agent:stopped-budget" }] },
    { number: UNREADY, labels: [] },
    { number: BEHIND, labels: [] },
  ];
  const out = queuedMerge(
    w,
    [CLOSED, STOPPED, UNREADY, ISSUE, BEHIND],
    [
      openListing(open),
      stateListing(UNREADY, { pr: 20, stage: "review" }),
      // Ready with an older PR, but behind #7 in the queue.
      stateListing(BEHIND, { pr: 10, stage: "merge" }),
      ...finishReplies(),
    ],
  );
  assert.equal(
    out,
    replyLine({ ok: true, op: "merge", posted: 0, merged: true }),
  );
  // Only the open, unstopped #11 ahead has its state read.
  assert.deepEqual(calls().slice(0, ORDER_CALLS), [
    VIEW_ARGS,
    OPEN_ARGS,
    listCall(UNREADY),
  ]);
  assert.equal(calls()[ORDER_CALLS]?.[1], "merge");
});
