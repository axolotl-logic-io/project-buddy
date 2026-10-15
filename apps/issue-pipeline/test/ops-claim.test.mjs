// The claim op through the ops CLI, pinned to the replies, gh calls and
// worktrees it made before it moved to src/ops/claim.ts (#183).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import {
  ACCOUNT,
  askOps,
  calls,
  claimComment,
  commentsReply,
  configWith,
  ghCalls,
  reply,
  root,
  runDir,
  sh,
  stateBody,
  stateComment,
  TIME,
  worktree,
} from "./ops-cli-test-kit.mjs";

const LIVE = new Date().toISOString();
const LAPSED = "2020-01-01T00:00:00Z";
const LANE = { lane: "me", sweepId: "s1" };
const SETUP_MARK = "setup-ran";

// A claim runs after a sweep, which made the clone.
sh(`git clone -q ${root}/origin.git ${root}/clones/o__r`);

function issueReply(n, extra = {}) {
  const issue = {
    number: n,
    title: `Issue ${n}`,
    body: "",
    state: "open",
    user: { login: ACCOUNT },
    labels: [],
    ...extra,
  };
  return { when: `api repos/o/r/issues/${n}`, stdout: JSON.stringify(issue) };
}

function getIssue(n) {
  return ["api", `repos/o/r/issues/${n}`];
}

const CLAIM_TEXT =
  "Lane `me` is claiming this issue. If another lane claimed it first, this lane abandons it and takes another issue.";
const LEASE = { lane: "me", sweepId: "s1", at: TIME };
const NEW_STATE = {
  version: 1,
  number: 0,
  depth: 0,
  stage: "triage",
  lease: LEASE,
  pr: null,
  headSha: null,
  reviewedSha: null,
  verifiedSha: null,
  plan: null,
  allocated: 0,
  reportedTokens: 0,
  sessions: [],
  triages: 0,
  continuations: 0,
  round: 0,
  ciFixes: 0,
  syncs: 0,
  findings: [],
  resolvedHistory: [],
  questionsAt: null,
  log: [],
};

function postClaim(n) {
  return ghCalls.postRaw(
    n,
    `**🤖 issue-pipeline · claim**\n<sub>deterministic step, no model · run \`s1\`</sub>\n<!-- agent-pipeline:comment role=claim -->\n\n${CLAIM_TEXT}\n<!-- agent-pipeline:claim lane=me sweep=s1 -->`,
  );
}

function postState(n, state) {
  return ghCalls.post(n, stateBody(n, state));
}

function patchState(n, id, state) {
  return ghCalls.patch(id, stateBody(n, state));
}

function claimReply(n, extra) {
  return {
    ok: true,
    op: "claim",
    posted: 0,
    remoteHead: null,
    paths: claimPaths(n),
    ...extra,
  };
}

function claimPaths(n, wiki = null) {
  return {
    worktree: worktree(n),
    runDir: runDir(n),
    issueFile: path.join(runDir(n), "issue.md"),
    handoffFile: path.join(runDir(n), "handoff.md"),
    wiki,
  };
}

test("a claim loses to another lane's live claim", () => {
  reply([
    issueReply(40),
    commentsReply(40, [claimComment(9, "other", "s0", LIVE)]),
  ]);
  assert.deepEqual(askOps({ op: "claim", number: 40, ...LANE }), {
    ok: true,
    op: "claim",
    posted: false,
    lost: true,
    holder: "other",
  });
  assert.deepEqual(calls(), [getIssue(40), ghCalls.listComments(40)]);
});

test("a claim refuses an issue that isn't open", () => {
  reply([issueReply(41, { state: "closed" })]);
  assert.deepEqual(askOps({ op: "claim", number: 41, ...LANE }), {
    ok: false,
    error: "#41 is not open",
  });
  assert.deepEqual(calls(), [getIssue(41), ghCalls.listComments(41)]);
});

test("a claim of new work posts its claim, makes the worktree and runs setup", () => {
  const config = configWith({
    commands: { test: "true", setup: `touch ${SETUP_MARK}` },
  });
  const mine = claimComment(100, "me", "s0", LIVE);
  reply([
    issueReply(42),
    commentsReply(42, []),
    { when: "issues/42/comments -f", stdout: JSON.stringify(mine) },
    commentsReply(42, [mine]),
  ]);
  const state = { ...NEW_STATE, number: 42 };
  assert.deepEqual(
    askOps({ op: "claim", config, number: 42, ...LANE }),
    claimReply(42, {
      state,
      claim: { id: 100, posted: true, waited: 0 },
    }),
  );
  assert.deepEqual(calls(), [
    getIssue(42),
    ghCalls.listComments(42),
    postClaim(42),
    ghCalls.label(42, "agent:working"),
    ghCalls.listComments(42),
    ghCalls.unlabel(42, "agent:needs-info"),
    ghCalls.label(42, "agent:working"),
    ghCalls.listComments(42),
    postState(42, state),
  ]);
  assert.ok(fs.existsSync(path.join(worktree(42), SETUP_MARK)));
  assert.ok(fs.existsSync(path.join(runDir(42), "setup-at-claim.log")));
});

// startState's restart of #43 at review, on its PR's branch at `sha`.
function answeredState(sha) {
  return {
    ...NEW_STATE,
    number: 43,
    stage: "review",
    pr: 50,
    headSha: sha,
    log: [
      `${TIME} restarted on the existing branch (PR #50) at review after answered questions; limits reset`,
    ],
    implemented: true,
  };
}

test("a claim of an answered issue with a PR clears its labels and labels the PR", () => {
  sh(
    `cd ${root}/seed && git checkout -qb agent/issue-43 integration && echo 2 > g && git add g && git commit -qm work && git push -q origin agent/issue-43`,
  );
  const comments = [
    claimComment(10, "me", "s0", LIVE),
    stateComment(11, {
      stage: "triage",
      questionsAt: LAPSED,
      lease: null,
      pr: 50,
    }),
  ];
  reply([
    issueReply(43, {
      labels: [{ name: "agent:needs-info" }, { name: "agent:stopped-budget" }],
    }),
    commentsReply(43, comments),
    { when: "pr list", stdout: JSON.stringify([{ number: 50 }]) },
    commentsReply(43, comments),
  ]);
  const sha = sh(`git -C ${root}/seed rev-parse HEAD`);
  const state = answeredState(sha);
  assert.deepEqual(
    askOps({ op: "claim", number: 43, ...LANE }),
    claimReply(43, {
      state,
      claim: { id: 10, posted: false },
      remoteHead: sha,
    }),
  );
  assert.deepEqual(calls(), [
    getIssue(43),
    ghCalls.listComments(43),
    [
      "pr",
      "list",
      "-R",
      "o/r",
      "--head",
      "agent/issue-43",
      "--state",
      "open",
      "--json",
      "number",
    ],
    ghCalls.unlabel(43, "agent:needs-info"),
    ghCalls.unlabel(43, "agent:stopped-budget"),
    ghCalls.label(43, "agent:working"),
    ghCalls.label(50, "agent:working"),
    ["api", "repos/o/r/issues/50/labels"],
    ghCalls.listComments(43),
    patchState(43, 11, state),
  ]);
});

test("a claim that resumes a lapsed lease keeps its stage and its worktree", () => {
  sh(
    `git -C ${root}/clones/o__r worktree add -q -B agent/issue-44 ${worktree(44)} origin/integration && touch ${worktree(44)}/wip`,
  );
  const state = stateComment(12, {
    stage: "implement",
    lease: { lane: "other", sweepId: "s0", at: LAPSED },
    pr: null,
  });
  const mine = claimComment(101, "me", "s0", LIVE);
  reply([
    issueReply(44, { labels: [{ name: "agent:working" }] }),
    commentsReply(44, [claimComment(13, "other", "s0", LAPSED), state]),
    { when: "issues/44/comments -f", stdout: JSON.stringify(mine) },
    commentsReply(44, [mine]),
    commentsReply(44, [state]),
  ]);
  const kept = { pr: null, stage: "implement", lease: LEASE };
  assert.deepEqual(
    askOps({ op: "claim", number: 44, ...LANE }),
    claimReply(44, {
      state: kept,
      claim: { id: 101, posted: true, waited: 0 },
    }),
  );
  assert.deepEqual(calls(), [
    getIssue(44),
    ghCalls.listComments(44),
    postClaim(44),
    ghCalls.label(44, "agent:working"),
    ghCalls.listComments(44),
    ghCalls.unlabel(44, "agent:needs-info"),
    ghCalls.label(44, "agent:working"),
    ghCalls.listComments(44),
    patchState(44, 12, kept),
  ]);
  assert.ok(fs.existsSync(path.join(worktree(44), "wip")));
});
