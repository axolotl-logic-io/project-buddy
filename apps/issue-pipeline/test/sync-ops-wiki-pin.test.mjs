// @ts-check
// sync-base, finish-sync and push on a branch whose commits move the wiki pin
// and put it back, with the wiki checkout ahead of the pin (#458). Replaying
// those commits drops the gitlink's assume-unchanged mark; the moved wiki
// checkout still never counts as an uncommitted change and is never
// committed. Through the ops CLI against local origins and the fake gh.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { opsFixture } from "./ops-fixture.mjs";
import { addSubmodule } from "./submodule-test-kit.mjs";
import {
  movePinAndBack,
  pinAt,
  resetAcrossPin,
  statusOf,
  wikiAhead,
} from "./wiki-pin-test-kit.mjs";

const fx = await opsFixture("sync-wiki-pin");
const { sh, worktree } = fx;
const { loadConfig } = await import("../src/config.ts");
const { ensureWiki } = await import("../src/wiki.ts");
const { ensureClone, ensureWorktree } = await import("../src/checkouts.ts");

const wikiOrigin = path.join(fx.root, "wiki.git");
const wikiSeed = path.join(fx.root, "wiki-seed");
sh(`git init -q --bare -b master ${wikiOrigin}`);
sh(`git clone -q ${wikiOrigin} ${wikiSeed} 2>/dev/null`);
sh(`cd ${wikiSeed} && git config user.email a@b && git config user.name a`);
sh(`cd ${wikiSeed} && echo home > Home.md && git add . && git commit -qm home`);
sh(`cd ${wikiSeed} && git push -q origin HEAD:master`);
addSubmodule(path.join(fx.root, "seed"), wikiOrigin);
sh(`git -C ${fx.root}/seed push -q origin integration`);
fx.fetchClone();
sh(`git -C ${fx.root}/clones/o__r reset --hard origin/integration`);
const config = fx.configWith("wiki-config.json", { wiki: true });
const cfg = loadConfig(config);
ensureClone(cfg);
const origin = path.join(fx.root, "origin.git");

// One issue per test, so no test sees another's branch.
const ISSUE = { pinBeforeStop: 61, pinAfterStop: 62, clean: 63 };

/** @param {object} request @returns {any} the op's parsed reply */
function ask(request) {
  fx.fakeGh.reply([]);
  return JSON.parse(fx.ask(request, config));
}

/**
 * Issue `n`'s branch on the base, its wiki checkout one commit ahead of the
 * pin: `steps` in order, each "pin" (move the pin and put it back) or a
 * file to commit with "mine", pushed.
 * @param {number} n
 * @param {readonly string[]} steps
 * @returns {{ wt: string, wikiHead: string }}
 */
function branchWith(n, steps) {
  fx.fetchClone();
  ensureWorktree(cfg, n);
  ensureWiki(cfg, n);
  const wt = worktree(n);
  const wikiHead = wikiAhead(wt, `W${n}`);
  for (const step of steps) {
    if (step === "pin") {
      movePinAndBack(wt);
    } else {
      fx.commitIn(n, step, "mine");
    }
  }
  fx.pushFrom(n);
  return { wt, wikiHead };
}

/** @param {string} wt @param {string} file resolves the stopped commit's `file` and continues the rebase, staging with -A */
function resolveAndContinue(wt, file) {
  fs.writeFileSync(path.join(wt, file), "resolved\n");
  sh(`cd ${wt} && git add -A && GIT_EDITOR=true git rebase --continue`);
}

/** @param {number} n @returns {string} the wiki commit #n's branch on origin pins */
function pushedPin(n) {
  return pinAt(origin, `agent/issue-${n}`);
}

test("a kept conflict after commits that move the wiki pin and put it back shows only the conflict, and finish-sync pushes the base's pin", () => {
  const n = ISSUE.pinBeforeStop;
  const file = `g${n}`;
  const { wt, wikiHead } = branchWith(n, ["pin", file]);
  fx.advanceBase(file, "theirs");
  const sync = ask({ op: "sync-base", number: n, keepConflict: true });
  assert.equal(sync.conflict, true);
  assert.equal(sync.inRebase, true);
  assert.equal(statusOf(wt), `AA ${file}`);
  resolveAndContinue(wt, file);
  const finish = ask({ op: "finish-sync", number: n });
  assert.equal(finish.resolved, true, finish.reason);
  assert.equal(pushedPin(n), pinAt(origin, "integration"));
  assert.equal(sh(`git -C ${wt}/wiki rev-parse HEAD`), wikiHead);
});

test("finish-sync pushes a rebase the resolver continued itself past commits that move the wiki pin", () => {
  const n = ISSUE.pinAfterStop;
  const file = `g${n}`;
  const { wt, wikiHead } = branchWith(n, [file, "pin"]);
  fx.advanceBase(file, "theirs");
  const sync = ask({ op: "sync-base", number: n, keepConflict: true });
  assert.equal(sync.inRebase, true);
  resolveAndContinue(wt, file);
  const finish = ask({ op: "finish-sync", number: n });
  assert.equal(finish.resolved, true, finish.reason);
  assert.equal(pushedPin(n), pinAt(origin, "integration"));
  assert.equal(statusOf(wt), "");
  assert.equal(sh(`git -C ${wt}/wiki rev-parse HEAD`), wikiHead);
});

test("a clean sync-base past commits that move the wiki pin leaves the checkout clean, and a push after a writer's own reset across them succeeds", () => {
  const n = ISSUE.clean;
  const { wt } = branchWith(n, [`own${n}`, "pin"]);
  fx.advanceBase(`b${n}`, "base");
  const sync = ask({ op: "sync-base", number: n });
  assert.equal(sync.changed, true, sync.error);
  assert.equal(statusOf(wt), "");
  resetAcrossPin(wt);
  const pushed = ask({ op: "push", number: n });
  assert.equal(pushed.ok, true, pushed.error);
  assert.equal(pushedPin(n), pinAt(origin, "integration"));
});
