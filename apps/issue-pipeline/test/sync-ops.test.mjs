// @ts-check
// prepare-review, sync-base and finish-sync: their replies, review diffs and
// the branch on origin, run through the ops CLI against a local origin. None
// of them calls gh.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { okLine, opsFixture, opsSourceDefines } from "./ops-fixture.mjs";
import { pushRecord } from "./push-record-test-kit.mjs";

const fx = await opsFixture("sync-ops");
const { fakeGh, originRef, sh, worktree } = fx;
const BASE = "origin/integration";
const WIKI_HEADING =
  "\n\n# Wiki changes (paths under wiki/; pushed to the wiki when the PR merges)\n\n";
// Each test's issue. Two tests share 33, as they always have.
const ISSUE = {
  mergeBase: 21, sinceSha: 22, rebasedSince: 23, wiki: 24, upToDate: 31, movedBase: 32, refusedPush: 33,
  conflict: 33, keptConflict: 34, unfinished: 41, aborted: 42, abortedWithReason: 43, uncommitted: 44,
  offBase: 45, noCommits: 46, markers: 47, finished: 48,
};
const UNCOMMITTED_FILES = 21;
const NAME_DIGITS = 2;
const MARKER_ROUNDS = 4;
const MARKERS_SHOWN = 10;
const EXECUTABLE = 0o755;

// Every gh call an op made, with its request; the last test checks for none.
/** @type {{ request: object, calls: string[][] }[]} */
const ghCalls = [];

// Runs an op, recording any gh calls it makes; returns its stdout.
/** @param {object} request @param {string} [config] @returns {string} */
function ask(request, config) {
  fakeGh.reply([]);
  const out = fx.ask(request, config);
  const calls = fakeGh.calls();
  if (calls.length > 0) {
    ghCalls.push({ request, calls });
  }
  return out;
}

/** @param {string} dir @param {string} args @returns {string} */
function gitIn(dir, args) {
  return sh(`git -C ${dir} ${args}`);
}

// A diff exactly as git prints it, untrimmed.
/** @param {string} dir @param {string} range @returns {string} */
function patch(dir, range) {
  const args = ["-C", dir, "diff", "--stat", "--patch", range];
  return spawnSync("git", args, { encoding: "utf8" }).stdout;
}

/** @typedef {{ file: string, reply: { headSha: string, baseSha: string, diffPath: string, diffLines: number, changedFiles: string[] } }} Review */

// What prepare-review should reply and write for the diff `from..HEAD`.
/** @param {number} n @param {string | undefined} from @param {string} tag @param {{ diff: string, files: string[] }} [wiki] @returns {Review} */
function review(n, from, tag, wiki = { diff: "", files: [] }) {
  const wt = worktree(n);
  const headSha = gitIn(wt, "rev-parse HEAD");
  const baseSha = gitIn(wt, `merge-base ${BASE} HEAD`);
  const code = patch(wt, `${from ?? baseSha}..${headSha}`);
  let file = code;
  if (wiki.diff !== "") {
    file = `${code}${WIKI_HEADING}${wiki.diff}`;
  }
  const names = gitIn(wt, `diff --name-only ${baseSha}..${headSha}`);
  const diffPath = path.join(fx.root, "runs", "o__r", `issue-${n}`, `review-${tag}`, "diff.patch");
  const changedFiles = names.split("\n").concat(wiki.files);
  const diffLines = file.split("\n").length;
  return { file, reply: { headSha, baseSha, diffPath, diffLines, changedFiles } };
}

// What prepare-review replied and wrote, beside what it should have.
/** @param {string} out @param {Review} want @returns {{ got: { out: string, file: string }, expected: { out: string, file: string } }} */
function reviewOutcome(out, want) {
  const file = fs.readFileSync(want.reply.diffPath, "utf8");
  return { got: { out, file }, expected: { out: okLine("prepare-review", want.reply), file: want.file } };
}

test("the sync ops live in src/ops/sync.ts", async () => {
  const { syncOps } = await import("../src/ops/sync.ts");
  const names = ["prepare-review", "sync-base", "finish-sync"];
  assert.deepEqual(Object.keys(syncOps), names);
  for (const name of names) {
    assert.equal(opsSourceDefines(name), false, name);
  }
});

test("prepare-review diffs the branch from its merge base", () => {
  fx.startBranch(ISSUE.mergeBase, "g", "one");
  fx.commitIn(ISSUE.mergeBase, "h", "two");
  fx.advanceBase("b21", "base");
  const out = ask({ op: "prepare-review", number: ISSUE.mergeBase });
  const want = review(ISSUE.mergeBase, undefined, "r0");
  assert.deepEqual(want.reply.changedFiles, ["g", "h"]);
  const { got, expected } = reviewOutcome(out, want);
  assert.deepEqual(got, expected);
});

test("prepare-review diffs from sinceSha while it is in the branch", () => {
  const n = ISSUE.sinceSha;
  const since = fx.startBranch(n, "g", "one");
  fx.commitIn(n, "h", "two");
  const out = ask({ op: "prepare-review", number: n, sinceSha: since, tag: "r2" });
  const want = review(n, since, "r2");
  assert.ok(want.file.includes("+two"));
  assert.ok(!want.file.includes("+one"));
  const { got, expected } = reviewOutcome(out, want);
  assert.deepEqual(got, expected);
});

test("prepare-review falls back to the merge base when sinceSha was rebased away", () => {
  const n = ISSUE.rebasedSince;
  fx.startBranch(n, "g", "one");
  const since = fx.commitIn(n, "h", "two");
  gitIn(worktree(n), "commit -q --amend -m reworded");
  const out = ask({ op: "prepare-review", number: n, sinceSha: since });
  const { got, expected } = reviewOutcome(out, review(n, undefined, "r0"));
  assert.deepEqual(got, expected);
});

test("prepare-review appends the issue's wiki commits", () => {
  const wikiOrigin = path.join(fx.root, "wiki.git");
  const seed = path.join(fx.root, "wiki-seed");
  sh(`git init -q --bare -b master ${wikiOrigin} && git clone -q ${wikiOrigin} ${seed} 2>/dev/null`);
  sh(`cd ${seed} && git config user.email a@b && git config user.name a`);
  sh(`cd ${seed} && echo home > Home.md && git add . && git commit -qm home && git push -q origin HEAD:master`);
  const config = fx.configWith("wiki-config.json", { wiki: { url: wikiOrigin } });
  fx.startBranch(ISSUE.wiki, "g", "one");
  const wiki = path.join(worktree(ISSUE.wiki), "wiki");
  sh(`git clone -q ${wikiOrigin} ${wiki} && cd ${wiki} && git config user.email a@b && git config user.name a`);
  sh(`cd ${wiki} && echo page > Page.md && git add . && git commit -qm page`);
  const out = ask({ op: "prepare-review", number: ISSUE.wiki }, config);
  const diff = patch(wiki, "origin/master...HEAD");
  const want = review(ISSUE.wiki, undefined, "r0", { diff, files: ["wiki/Page.md"] });
  assert.deepEqual(want.reply.changedFiles, ["g", "wiki/Page.md"]);
  const { got, expected } = reviewOutcome(out, want);
  assert.deepEqual(got, expected);
});

test("sync-base leaves an up-to-date branch alone", () => {
  const headSha = fx.startBranch(ISSUE.upToDate, "g", "one");
  const out = ask({ op: "sync-base", number: ISSUE.upToDate });
  assert.equal(out, okLine("sync-base", { changed: false, conflict: false, headSha }));
  assert.equal(originRef("agent/issue-31"), headSha);
});

test("sync-base rebases onto a moved base and pushes", () => {
  const before = fx.startBranch(ISSUE.movedBase, "g", "one");
  const base = fx.advanceBase("b32", "base");
  const out = ask({ op: "sync-base", number: ISSUE.movedBase });
  const headSha = originRef("agent/issue-32");
  assert.notEqual(headSha, before);
  assert.equal(out, okLine("sync-base", { changed: true, conflict: false, headSha }));
  assert.equal(originRef(`${headSha}^`), base);
  const record = { sha: headSha, op: "sync-base", dated: true };
  assert.deepEqual(pushRecord(fx.root, ISSUE.movedBase), record);
});

test("sync-base whose push origin refuses goes back to its old head", () => {
  const n = ISSUE.refusedPush;
  const before = fx.startBranch(n, "g", "one");
  fx.advanceBase("b33", "base");
  const hook = path.join(fx.root, "origin.git", "hooks", "pre-receive");
  fs.writeFileSync(hook, "#!/bin/sh\nexit 1\n", { mode: EXECUTABLE });
  let out = "";
  try {
    out = ask({ op: "sync-base", number: n });
  } finally {
    fs.rmSync(hook);
  }
  assert.equal(JSON.parse(out).ok, false);
  assert.equal(originRef("agent/issue-33"), before);
  assert.deepEqual(fx.worktreeState(n), { head: before, status: "" });
});

// A branch whose file `c<n>` conflicts with the same file added on the base.
/** @param {number} n @returns {{ headSha: string, baseSha: string }} */
function conflicting(n) {
  const headSha = fx.startBranch(n, `c${n}`, "mine");
  const baseSha = fx.advanceBase(`c${n}`, "theirs");
  return { headSha, baseSha };
}

/** @param {number} n @param {boolean} inRebase @param {string} baseSha @returns {string} */
function conflictLine(n, inRebase, baseSha) {
  const conflicts = [`c${n}`];
  return okLine("sync-base", { changed: false, conflict: true, inRebase, conflicts, baseSha });
}

test("sync-base reports a conflict and aborts the rebase", () => {
  const n = ISSUE.conflict;
  const { headSha, baseSha } = conflicting(n);
  const out = ask({ op: "sync-base", number: n });
  assert.equal(out, conflictLine(n, false, baseSha));
  assert.equal(fx.inRebase(n), false);
  assert.deepEqual(fx.worktreeState(n), { head: headSha, status: "" });
  assert.equal(originRef("agent/issue-33"), headSha);
});

test("sync-base keeps a conflicting rebase, and resets it on the next run", () => {
  const n = ISSUE.keptConflict;
  const { headSha, baseSha } = conflicting(n);
  const kept = ask({ op: "sync-base", number: n, keepConflict: true });
  assert.equal(kept, conflictLine(n, true, baseSha));
  assert.equal(fx.inRebase(n), true);
  const again = ask({ op: "sync-base", number: n, keepConflict: false });
  assert.equal(again, conflictLine(n, false, baseSha));
  assert.equal(fx.inRebase(n), false);
  assert.deepEqual(fx.worktreeState(n), { head: headSha, status: "" });
});

// A conflicting rebase kept in the worktree for a writer, as sync-base leaves it.
/** @param {number} n @returns {string} */
function keptConflict(n) {
  const { headSha } = conflicting(n);
  ask({ op: "sync-base", number: n, keepConflict: true });
  return headSha;
}

// Runs finish-sync expecting `reason`; returns what it did beside what it should
// have: that reply, with the worktree and origin left at `headSha`.
/** @param {number} n @param {object} request @param {string} reason @param {string} [headSha] @returns {{ got: object, expected: object }} */
function failure(n, request, reason, headSha = originRef(`agent/issue-${n}`)) {
  const out = ask({ op: "finish-sync", number: n, ...request });
  const state = { inRebase: false, worktree: { head: headSha, status: "" }, origin: headSha };
  const got = { out, inRebase: fx.inRebase(n), worktree: fx.worktreeState(n), origin: originRef(`agent/issue-${n}`) };
  return { got, expected: { out: okLine("finish-sync", { resolved: false, reason }), ...state } };
}

test("finish-sync resets the worktree on an abort or an unfinished rebase", () => {
  const unfinished = failure(ISSUE.unfinished, {}, "the rebase was not finished", keptConflict(ISSUE.unfinished));
  assert.deepEqual(unfinished.got, unfinished.expected);
  const head = keptConflict(ISSUE.aborted);
  const aborted = failure(ISSUE.aborted, { abort: true }, "aborted", head);
  assert.deepEqual(aborted.got, aborted.expected);
  keptConflict(ISSUE.abortedWithReason);
  const withReason = failure(ISSUE.abortedWithReason, { abort: true, reason: "no time left" }, "no time left");
  assert.deepEqual(withReason.got, withReason.expected);
});

test("finish-sync refuses a worktree with uncommitted changes", () => {
  fx.startBranch(ISSUE.uncommitted, "g", "one");
  const names = Array.from({ length: UNCOMMITTED_FILES }, (_, at) => `u${String(at + 1).padStart(NAME_DIGITS, "0")}`);
  for (const name of names) {
    fs.writeFileSync(path.join(worktree(ISSUE.uncommitted), name), "x\n");
  }
  const lines = names.slice(1).map((name) => `?? ${name}`);
  const reason = `the worktree has uncommitted changes:\n${lines.join("\n")}`;
  const { got, expected } = failure(ISSUE.uncommitted, {}, reason);
  assert.deepEqual(got, expected);
});

test("finish-sync refuses a branch not on the base", () => {
  fx.startBranch(ISSUE.offBase, "g", "one");
  fx.advanceBase("b45", "base");
  fx.fetchClone();
  const { got, expected } = failure(ISSUE.offBase, {}, `HEAD is not based on ${BASE}`);
  assert.deepEqual(got, expected);
});

test("finish-sync refuses a branch with no commits left", () => {
  keptConflict(ISSUE.noCommits);
  gitIn(worktree(ISSUE.noCommits), "rebase --abort");
  gitIn(worktree(ISSUE.noCommits), `reset -q --hard ${BASE}`);
  const { got, expected } = failure(ISSUE.noCommits, {}, "the branch has no commits left after the rebase");
  assert.deepEqual(got, expected);
});

test("finish-sync refuses conflict markers", () => {
  const round = ["<<<<<<< ours", "=======", ">>>>>>> theirs"];
  const markers = Array.from({ length: MARKER_ROUNDS }, () => round).flat();
  fx.startBranch(ISSUE.markers, "m", ["<<<<<<<x", ...markers, "======= no"].join("\n"));
  const shown = markers.slice(0, MARKERS_SHOWN).map((line) => `+${line}`);
  const { got, expected } = failure(ISSUE.markers, {}, `conflict markers remain:\n${shown.join("\n")}`);
  assert.deepEqual(got, expected);
});

test("finish-sync pushes a finished rebase", () => {
  keptConflict(ISSUE.finished);
  const wt = worktree(ISSUE.finished);
  fs.writeFileSync(path.join(wt, "c48"), "resolved\n");
  sh(`cd ${wt} && git add c48 && GIT_EDITOR=true git rebase --continue`);
  const out = ask({ op: "finish-sync", number: ISSUE.finished });
  const headSha = originRef("agent/issue-48");
  assert.equal(out, okLine("finish-sync", { resolved: true, headSha }));
  assert.equal(gitIn(wt, "rev-parse HEAD"), headSha);
  assert.equal(originRef(`${headSha}^`), originRef("integration"));
  const record = { sha: headSha, op: "finish-sync", dated: true };
  assert.deepEqual(pushRecord(fx.root, ISSUE.finished), record);
});

test("none of the sync ops calls gh", () => {
  assert.deepEqual(ghCalls, []);
});
