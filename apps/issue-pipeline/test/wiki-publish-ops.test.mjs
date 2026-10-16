// @ts-check
// The wiki's rebase ops: wiki-sync rebases #7's wiki commits onto the wiki's
// master and keeps them on origin's agent/issue-7, leaving a conflict stopped
// for the resolver; finish-wiki-sync keeps a resolved rebase or resets a bad
// one; publish leaves a conflict stopped and the issue open, with no patch.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import {
  ask,
  calls,
  fakeGh,
  GIT_USER,
  hoursFromNow,
  LANE,
  replyLine,
  SWEEP,
  sh,
  world,
} from "./ops-test-kit.mjs";
import { hasBranch, withWiki } from "./wiki-test-kit.mjs";

/** @import { World } from "./ops-test-kit.mjs" */

const ISSUE = 7;
const STATE = {
  pr: 50,
  stage: "publish",
  lease: { lane: LANE, sweepId: SWEEP, at: hoursFromNow(0) },
};

/** @param {World} w @returns {string} */
function wikiDir(w) {
  return path.join(w.worktree, "wiki");
}

/** @param {World} w @param {string} op @param {object} [fields] @returns {string} */
function runOp(w, op, fields = {}) {
  fakeGh.reply([]);
  return ask(w, { op, number: ISSUE, ...fields });
}

/** @param {string} op @param {object} reply @returns {string} */
function line(op, reply) {
  return replyLine({ ok: true, op, posted: 0, ...reply });
}

/** @param {string} origin @param {string} ref @returns {string} */
function revOf(origin, ref) {
  return sh(`git -C ${origin} rev-parse ${ref}`);
}

/** @param {string} origin @returns {object} */
function conflictOf(origin) {
  return {
    conflict: true,
    inRebase: true,
    conflicts: ["Home.md"],
    baseSha: revOf(origin, "master"),
    branch: "master",
  };
}

test("wiki-sync with no wiki has nothing to rebase", () => {
  const w = world();
  const none = { conflict: false, changed: false, headSha: "" };
  assert.equal(runOp(w, "wiki-sync"), line("wiki-sync", none));
});

test("wiki-sync rebases onto a moved master and keeps the result on agent/issue-7", () => {
  const w = world();
  const wiki = withWiki(w);
  const other = path.join(w.root, "wiki-other");
  sh(
    `git clone -q ${wiki.origin} ${other} 2>/dev/null && echo more > ${other}/Other.md && git -C ${other} add Other.md && git -C ${other} ${GIT_USER} commit -q -m more && git -C ${other} push -q origin HEAD:master`,
  );
  const out = runOp(w, "wiki-sync");
  const headSha = sh(`git -C ${wikiDir(w)} rev-parse HEAD`);
  const synced = { conflict: false, changed: true, headSha };
  assert.equal(out, line("wiki-sync", synced));
  assert.equal(revOf(wiki.origin, "agent/issue-7"), headSha);
  assert.equal(revOf(wiki.origin, "master"), revOf(wikiDir(w), "HEAD~1"));
});

test("a wiki-sync conflict stops the rebase, and an unfinished one is reset", () => {
  const w = world();
  const wiki = withWiki(w, { conflict: true });
  const out = runOp(w, "wiki-sync");
  assert.equal(out, line("wiki-sync", conflictOf(wiki.origin)));
  const finished = runOp(w, "finish-wiki-sync");
  const reason = "the rebase was not finished";
  assert.equal(finished, line("finish-wiki-sync", { resolved: false, reason }));
  assert.equal(revOf(wikiDir(w), "HEAD"), wiki.sha);
  assert.equal(sh(`git -C ${wikiDir(w)} status --porcelain`), "");
});

test("a resolved wiki rebase is kept on agent/issue-7", () => {
  const w = world();
  const wiki = withWiki(w, { conflict: true });
  runOp(w, "wiki-sync");
  const dir = wikiDir(w);
  sh(
    `echo both > ${dir}/Home.md && git -C ${dir} add Home.md && GIT_EDITOR=true git -C ${dir} ${GIT_USER} rebase --continue`,
  );
  const headSha = revOf(dir, "HEAD");
  const finished = runOp(w, "finish-wiki-sync");
  assert.equal(finished, line("finish-wiki-sync", { resolved: true, headSha }));
  assert.equal(revOf(wiki.origin, "agent/issue-7"), headSha);
});

test("a publish conflict stops the rebase and leaves the issue open with no patch", () => {
  const w = world();
  const wiki = withWiki(w, { conflict: true });
  const out = runOp(w, "publish", { state: STATE });
  const conflict = { published: false, ...conflictOf(wiki.origin) };
  assert.equal(out, line("publish", conflict));
  assert.deepEqual(calls(), []);
  assert.equal(hasBranch(wiki.origin, "agent/issue-7"), true);
  const runDir = path.join(w.root, "runs/o__r/issue-7");
  assert.equal(fs.existsSync(path.join(runDir, "wiki-unpushed.patch")), false);
  assert.equal(fs.existsSync(w.worktree), true);
});
