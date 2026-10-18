// @ts-check
// The implementor's start sync in a stage job (#419): mock model (the fake
// RPC pi), local git origins, and fake ops whose sync-base and finish-sync
// rebase and push in the job's checkout. A branch with the base's head skips
// the rebase with no comment; an implement entry behind its base rebases and
// pushes before the implementer starts; a stage job at sync saves at checks,
// with testsOnly after a clean rebase of a passed head; a conflict runs the
// resolver and pushes its resolution; a resolver's cannot-fix leaves the
// issue for the next job; past maxConflictFixes a conflict stops the issue.
import assert from "node:assert/strict";
import { test } from "node:test";
import { messageEnd, outputEnd } from "./fake-rpc-pi.mjs";
import { claimWith, implementReplies } from "./implementor-job-test-kit.mjs";
import { DONE } from "./implementor-role-test-kit.mjs";
import {
  behindBase,
  branchHead,
  contains,
  SYNC_OPS,
} from "./implementor-sync-job-test-kit.mjs";
import { branchOnOrigin } from "./job-git-test-kit.mjs";
import {
  logOf,
  piStarts,
  repliesAt,
  runJob,
  setUp,
  USAGE,
} from "./job-test-kit.mjs";

/** @import { Place } from "./job-test-kit.mjs" */

const IMPLEMENT = ["--stage", "implement"];
const SYNC = ["--stage", "sync"];
const FIXED = { status: "fixed", summary: "Kept the base's line." };
const CANNOT_FIX = { status: "cannot-fix", summary: "The sides contradict." };
// The resolver's commit: README.md, the conflicting file, as it resolves it.
const RESOLUTION = "repo/README.md";

/** @param {unknown} reply @returns {object[]} a session that spends USAGE and replies `reply` */
function session(reply) {
  return [messageEnd(USAGE), outputEnd(reply)];
}

/** @param {{ stdout: string }} r @returns {unknown} the job's end, from its summary line */
function endOf(r) {
  const [line = "{}"] = r.stdout.trim().split("\n").slice(-1);
  return JSON.parse(line).end;
}

/** @param {Place} place @param {string} op @returns {any[]} the requests of `op` */
function requestsOf(place, op) {
  return logOf(place, "ops.log").filter((request) => request.op === op);
}

/** @param {Place} place @returns {any} the last state the job saved */
function lastSaved(place) {
  return requestsOf(place, "save-state").at(-1)?.state;
}

/**
 * A stage job's place for #7 claimed at sync with `fields` in its state,
 * sync-base and finish-sync working in its checkout, and pi playing `script`.
 * @param {object} script
 * @param {Record<string, unknown>} [config]
 * @returns {Place}
 */
function atSync(script, config = {}) {
  return setUp({ ...repliesAt("sync"), ...SYNC_OPS }, script, config);
}

test("a stage job at sync on a branch that has the base's head saves at checks with no rebase and no comment, a passed head re-running only the tests", () => {
  const place = atSync({ events: session(FIXED) });
  const headSha = branchOnOrigin(place.origin);
  claimWith(place, { headSha, passedSha: headSha });
  const r = runJob(place, SYNC);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(endOf(r), { kind: "saved", stage: "checks" });
  assert.deepEqual(requestsOf(place, "sync-base"), []);
  assert.deepEqual(requestsOf(place, "post"), []);
  assert.deepEqual(piStarts(place), []);
  const saved = lastSaved(place);
  assert.equal(saved.testsOnly, true);
  assert.equal(saved.passedSha, null);
  assert.equal(branchHead(place.origin), headSha);
});

test("an implement entry on a branch behind its base rebases and pushes before the implementer starts", () => {
  const replies = { ...implementReplies(), ...SYNC_OPS };
  const place = setUp(replies, { events: session(DONE) });
  const { baseSha } = behindBase(place.origin, false);
  const r = runJob(place, IMPLEMENT);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(endOf(r), { kind: "saved", stage: "review" });
  const [sync] = requestsOf(place, "sync-base");
  assert.equal(sync?.keepConflict, true);
  const pushed = branchHead(place.origin);
  assert.ok(
    contains(place.origin, baseSha, pushed),
    "the base is in the pushed branch",
  );
  const [implementer] = piStarts(place);
  assert.equal(implementer?.head, pushed);
});

test("an implement entry at its spec's tests, behind its base, still runs the implementer after the rebase brings in the base's changes", () => {
  const replies = { ...implementReplies(), ...SYNC_OPS };
  const place = setUp(replies, { events: session(DONE) });
  const { branchSha } = behindBase(place.origin, false);
  claimWith(place, { headSha: branchSha, specTestsSha: branchSha });
  const r = runJob(place, IMPLEMENT);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(requestsOf(place, "sync-base").length, 1);
  assert.equal(piStarts(place).length, 1);
});

test("a stage job at sync with a clean rebase of a passed head pushes it and saves at checks with testsOnly", () => {
  const place = atSync({ events: session(FIXED) });
  const { branchSha, baseSha } = behindBase(place.origin, false);
  claimWith(place, { headSha: branchSha, passedSha: branchSha, syncs: 0 });
  const r = runJob(place, SYNC);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(endOf(r), { kind: "saved", stage: "checks" });
  const pushed = branchHead(place.origin);
  assert.ok(
    contains(place.origin, baseSha, pushed),
    "the base is in the pushed branch",
  );
  assert.deepEqual(piStarts(place), []);
  const saved = lastSaved(place);
  assert.equal(saved.testsOnly, true);
  assert.equal(saved.passedSha, null);
  assert.equal(saved.syncs, 1);
  assert.equal(saved.headSha, pushed);
});

test("a conflicting rebase runs the resolver, then the role continues the rebase and pushes the resolution", () => {
  const place = atSync({ events: session(FIXED), commit: RESOLUTION });
  const { branchSha, baseSha } = behindBase(place.origin, true);
  claimWith(place, { headSha: branchSha, passedSha: branchSha });
  const r = runJob(place, SYNC);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(endOf(r), { kind: "saved", stage: "checks" });
  assert.equal(piStarts(place).length, 1);
  const finishes = requestsOf(place, "finish-sync");
  assert.equal(finishes.length, 1);
  assert.notEqual(finishes[0]?.abort, true);
  const pushed = branchHead(place.origin);
  assert.ok(
    contains(place.origin, baseSha, pushed),
    "the base is in the pushed branch",
  );
  const saved = lastSaved(place);
  assert.equal(saved.testsOnly, false);
  assert.equal(saved.headSha, pushed);
});

test("a resolver's cannot-fix aborts the rebase and releases the issue at its stage for the next job", () => {
  const place = atSync({ events: session(CANNOT_FIX), commit: RESOLUTION });
  const { branchSha } = behindBase(place.origin, true);
  claimWith(place, { headSha: branchSha });
  const r = runJob(place, SYNC);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(endOf(r), { kind: "released" });
  assert.deepEqual(requestsOf(place, "stop"), []);
  const [finish] = requestsOf(place, "finish-sync");
  assert.equal(finish?.abort, true);
  assert.equal(branchHead(place.origin), branchSha);
});

test("past maxConflictFixes a conflict aborts the rebase and stops with agent:stopped-conflict, pushing nothing", () => {
  const place = atSync({ events: session(FIXED) }, { maxConflictFixes: 0 });
  const { branchSha } = behindBase(place.origin, true);
  claimWith(place, { headSha: branchSha });
  const r = runJob(place, SYNC);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(endOf(r), { kind: "stopped", code: "conflict" });
  assert.equal(requestsOf(place, "stop").at(-1)?.code, "conflict");
  assert.deepEqual(piStarts(place), []);
  const [finish] = requestsOf(place, "finish-sync");
  assert.equal(finish?.abort, true);
  assert.equal(branchHead(place.origin), branchSha);
});
