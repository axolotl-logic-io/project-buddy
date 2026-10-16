// The claim op's reset, at a restart, of a worktree whose head has commits
// that the issue's branch on GitHub lacks: they are saved under
// refs/pipeline/rescue/<n>/<stamp>, and HEAD is kept, or reset to the branch
// when someone pushed to it since (#283).
import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import { stateOf } from "./gh-effects.mjs";
import { issueReply, LANE, LIVE } from "./ops-claim-test-kit.mjs";
import {
  askOps,
  claimComment,
  commentsReply,
  effects,
  reply,
  root,
  sh,
  stateComment,
  TIME,
  worktree,
} from "./ops-cli-test-kit.mjs";

const COMMITTER = "-c user.email=a@b -c user.name=a";
const CLONE = `${root}/clones/o__r`;
// The issue whose worktree is ahead of its branch, the one whose worktree
// and branch have diverged, and the ids of their claim and state comments.
const AHEAD = 70;
const DIVERGED = 71;
const AHEAD_IDS = { claim: 170, state: 180 };
const DIVERGED_IDS = { claim: 171, state: 181 };

const CLAIM_REPLY = z.looseObject({ ok: z.literal(true) });
const LOG = z.array(z.string());

// A claim runs after a sweep, which made the clone.
sh(`git clone -q ${root}/origin.git ${CLONE}`);

// Pushes a commit to issue `n`'s branch on origin; returns its head.
/** @param {number} n @returns {string} */
function pushToBranch(n) {
  sh(
    `cd ${root}/seed && (git checkout -q agent/issue-${n} 2>/dev/null || git checkout -qb agent/issue-${n} integration)`,
  );
  sh(
    `cd ${root}/seed && echo x >> b-${n} && git add b-${n} && git commit -qm branch && git push -q origin HEAD:refs/heads/agent/issue-${n}`,
  );
  return sh(`git -C ${root}/seed rev-parse HEAD`);
}

// Gives issue `n` a branch on origin and a worktree with one commit on top
// of it. Returns the worktree's head.
/** @param {number} n @returns {string} */
function worktreeAheadOfBranch(n) {
  pushToBranch(n);
  sh(`git -C ${CLONE} fetch -q origin`);
  sh(
    `git -C ${CLONE} worktree add -q -B agent/issue-${n} ${worktree(n)} origin/agent/issue-${n}`,
  );
  sh(
    `cd ${worktree(n)} && echo mine > mine && git add mine && git ${COMMITTER} commit -qm mine`,
  );
  return sh(`git -C ${worktree(n)} rev-parse HEAD`);
}

// The rescue refs of issue `n`, as `<sha> <ref>` lines.
/** @param {number} n @returns {string[]} */
function rescueRefs(n) {
  const listed = sh(
    `git -C ${worktree(n)} for-each-ref --format='%(objectname) %(refname)' refs/pipeline/rescue/${n}/`,
  );
  return listed.split("\n").filter((line) => line !== "");
}

// Claims issue `n`, stopped too large, whose claim and state comments have
// the ids `ids`; returns the state's saved log.
/** @param {number} n @param {{ claim: number, state: number }} ids @returns {string[]} */
function claimStopped(n, ids) {
  const comments = [
    claimComment(ids.claim, "me", "s0", LIVE),
    stateComment(ids.state, {
      stage: "stopped",
      lease: null,
      pr: null,
      log: [`${TIME} stopped: too-large`],
    }),
  ];
  reply([
    issueReply(n, { labels: [{ name: "agent:stopped-too-large" }] }),
    commentsReply(n, comments),
    { when: "pr list", stdout: "[]" },
    commentsReply(n, comments),
  ]);
  CLAIM_REPLY.parse(askOps({ op: "claim", number: n, ...LANE }));
  const saved = stateOf(effects(), `edit comment ${ids.state} state`);
  return LOG.parse(z.looseObject({ log: z.unknown() }).parse(saved).log);
}

test("a claim keeps a worktree ahead of its branch and saves a rescue ref", () => {
  const sha = worktreeAheadOfBranch(AHEAD);
  const log = claimStopped(AHEAD, AHEAD_IDS);
  assert.equal(sh(`git -C ${worktree(AHEAD)} rev-parse HEAD`), sha);
  const refs = rescueRefs(AHEAD);
  assert.equal(refs.length, 1);
  const [rescueSha, ref] = String(refs[0]).split(" ");
  assert.equal(rescueSha, sha);
  assert.ok(log.some((line) => line.includes(String(ref))));
});

test("a claim resets a worktree that diverged from its branch, keeping a rescue ref", () => {
  const sha = worktreeAheadOfBranch(DIVERGED);
  const pushed = pushToBranch(DIVERGED);
  const log = claimStopped(DIVERGED, DIVERGED_IDS);
  assert.equal(sh(`git -C ${worktree(DIVERGED)} rev-parse HEAD`), pushed);
  const refs = rescueRefs(DIVERGED);
  assert.equal(refs.length, 1);
  const [rescueSha, ref] = String(refs[0]).split(" ");
  assert.equal(rescueSha, sha);
  assert.ok(log.some((line) => line.includes(String(ref))));
});
