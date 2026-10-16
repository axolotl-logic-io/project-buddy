// The claim op with the wiki on: commits on the wiki's agent/issue-<n> count
// as the issue's work when it restarts.
import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import {
  getIssue,
  issueReply,
  LANE,
  LIVE,
  patchState,
} from "./ops-claim-test-kit.mjs";
import {
  askOps,
  calls,
  claimComment,
  commentsReply,
  configWith,
  ghCalls,
  reply,
  root,
  sh,
  stateComment,
  TIME,
  worktree,
} from "./ops-cli-test-kit.mjs";

const ISSUE = 46;
// The ids of the issue's claim and state comments.
const CLAIM_ID = 16;
const STATE_ID = 17;

// A claim runs after a sweep, which made the clone.
sh(`git clone -q ${root}/origin.git ${root}/clones/o__r`);

// A wiki origin with a master seed commit, and its agent/issue-<n> one commit
// ahead; returns the wiki config and that commit.
function wikiAheadOnBranch(n) {
  const origin = path.join(root, "wiki.git");
  const seed = path.join(root, "wiki-seed");
  sh(`git init -q --bare -b master ${origin}`);
  sh(`git clone -q ${origin} ${seed} 2>/dev/null`);
  sh(`cd ${seed} && git config user.email a@b && git config user.name a`);
  sh(`cd ${seed} && echo home > Home.md && git add . && git commit -qm home`);
  sh(`cd ${seed} && git push -q origin HEAD:master`);
  sh(`cd ${seed} && echo page > Page.md && git add . && git commit -qm page`);
  sh(`cd ${seed} && git push -q origin HEAD:refs/heads/agent/issue-${n}`);
  const config = configWith({ wiki: { url: origin } });
  return { config, sha: sh(`git -C ${seed} rev-parse HEAD`) };
}

test("a claim restarts a stopped issue with only wiki work at review", () => {
  const { config, sha } = wikiAheadOnBranch(ISSUE);
  const comments = [
    claimComment(CLAIM_ID, "me", "s0", LIVE),
    stateComment(STATE_ID, {
      stage: "stopped",
      lease: null,
      pr: null,
      log: [`${TIME} stopped: budget`],
    }),
  ];
  reply([
    issueReply(ISSUE, { labels: [{ name: "agent:stopped-budget" }] }),
    commentsReply(ISSUE, comments),
    commentsReply(ISSUE, comments),
  ]);
  const out = askOps({ op: "claim", config, number: ISSUE, ...LANE });
  assert.equal(out.ok, true);
  assert.equal(out.state.stage, "review");
  assert.equal(out.state.pr, null);
  assert.equal(out.state.implemented, true);
  const wiki = path.join(worktree(ISSUE), "wiki");
  assert.equal(out.paths.wiki, wiki);
  assert.equal(sh(`git -C ${wiki} rev-parse HEAD`), sha);
  // No listOpenPrs call: the issue has no code branch.
  assert.deepEqual(calls(), [
    getIssue(ISSUE),
    ghCalls.listComments(ISSUE),
    ghCalls.unlabel(ISSUE, "agent:needs-info"),
    ghCalls.unlabel(ISSUE, "agent:stopped-budget"),
    ghCalls.label(ISSUE, "agent:working"),
    ghCalls.listComments(ISSUE),
    patchState(ISSUE, STATE_ID, out.state),
  ]);
});
