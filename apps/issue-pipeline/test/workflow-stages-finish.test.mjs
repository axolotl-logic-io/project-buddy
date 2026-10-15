// The built workflow's acceptance, security review and merge paths, run
// through workflow-harness.mjs. Each test pins the launch keys and the summary
// by hand, and the whole trace in workflow-stages-finish.test.mjs.snapshot.
import assert from "node:assert/strict";
import { test } from "node:test";
import { runWorkflow } from "./workflow-harness.mjs";
import {
  claimAt,
  ISSUE,
  launchKeys,
  ROUTINE_OPS,
  replyWith,
  sweepReply,
  sweepSummary,
  WORKFLOW_ARGS,
} from "./workflow-stages-fixtures.mjs";

// Issue #7 with its checks passed at fffffff.
const CHECKED = {
  pr: 42,
  headSha: "fffffff",
  reviewedSha: "fffffff",
  verifiedSha: "fffffff",
  verifySummary: "test: passed",
  implemented: true,
  spec: "## Behaviour\n\n1. src/a.ts does the thing.",
  allocated: 820_000,
};
// Issue #7 with acceptance passed.
const ACCEPTED = {
  ...CHECKED,
  acceptReason: "Does what #7 asks.",
  allocated: 880_000,
};
// Issue #7 with the security review passed.
const SECURED = { ...ACCEPTED, allocated: 940_000 };
const PREPARED = { "prepare-review": { ok: true, headSha: "fffffff" } };
// A security reviewer's finding that harms the users.
const LEAK = {
  file: "src/a.ts",
  line: 9,
  title: "Logs the user's email",
  evidence: "console.log(user.email) on every request.",
  suggestion: "Drop the log line.",
  category: "user-harm",
};

// A run of issue #7 claimed at `stage` with `fields`, with ops and agents.
function finishRun({ stage, fields, ops = {}, agents = {}, config = {} }) {
  return runWorkflow({
    args: WORKFLOW_ARGS,
    ops: {
      ...ROUTINE_OPS,
      sweep: sweepReply({ items: [ISSUE], config }),
      claim: claimAt(stage, fields),
      ...ops,
    },
    agents,
  });
}

// The one summary item of issue #7, with `fields` replacing the defaults.
function issueSummary(fields) {
  return sweepSummary({
    items: [
      { issue: 7, pr: 42, outcome: "in-progress", reason: null, ...fields },
    ],
  });
}

// The summary of issue #7 stopped at `stage` by LEAK past its fix rounds.
function leakStopped(stage) {
  return issueSummary({
    stage,
    outcome: "stopped",
    reason:
      "security review (user-harm): Logs the user's email is still open after 2 fix rounds",
    allocatedTokens: 940_000,
  });
}

test("passing acceptance moves to security, held by the spawn cap", async ({
  assert: { snapshot },
}) => {
  // security needs 3 spawns: 4 launched + 3 + a reserve of 4 passes 10.
  const { trace, summary } = await finishRun({
    stage: "accept",
    fields: CHECKED,
    ops: PREPARED,
    agents: {
      "i7-accept": replyWith({ verdict: "pass", reason: "Does what #7 asks." }),
    },
    config: { maxSpawnsPerRun: 10 },
  });
  assert.deepEqual(launchKeys(trace), [
    "sweep-1",
    "i7-claim-2",
    "i7-prep-3",
    "i7-accept-4",
    "i7-release-5",
  ]);
  assert.deepEqual(
    summary,
    issueSummary({ stage: "security", allocatedTokens: 880_000 }),
  );
  snapshot(trace);
});

test("failing acceptance stops the issue", async ({ assert: { snapshot } }) => {
  const { trace, summary } = await finishRun({
    stage: "accept",
    fields: CHECKED,
    ops: PREPARED,
    agents: {
      "i7-accept": replyWith({ verdict: "fail", reason: "Misses item 1." }),
    },
  });
  assert.deepEqual(launchKeys(trace), [
    "sweep-1",
    "i7-claim-2",
    "i7-prep-3",
    "i7-accept-4",
    "i7-stop-5",
  ]);
  assert.deepEqual(
    summary,
    issueSummary({
      stage: "accept",
      outcome: "stopped",
      reason: "the acceptance verifier found the issue is not fully resolved",
      allocatedTokens: 880_000,
    }),
  );
  snapshot(trace);
});

test("a security review with no findings moves to merge, held by the spawn cap", async ({
  assert: { snapshot },
}) => {
  // merge needs 2 spawns: 5 launched + 2 + a reserve of 4 passes 10.
  const { trace, summary } = await finishRun({
    stage: "security",
    fields: ACCEPTED,
    ops: PREPARED,
    agents: { "i7-security": replyWith({ findings: [] }) },
    config: { maxSpawnsPerRun: 10 },
  });
  assert.deepEqual(launchKeys(trace), [
    "sweep-1",
    "i7-claim-2",
    "i7-prep-3",
    "i7-security-4",
    "i7-save-5",
    "i7-release-6",
  ]);
  assert.deepEqual(
    summary,
    issueSummary({ stage: "merge", allocatedTokens: 940_000 }),
  );
  snapshot(trace);
});

test("a security finding sends the issue back to fix, held by the spawn cap", async ({
  assert: { snapshot },
}) => {
  // fix needs 8 spawns: 5 launched + 8 + a reserve of 4 passes 16.
  const { trace, summary } = await finishRun({
    stage: "security",
    fields: ACCEPTED,
    ops: PREPARED,
    agents: { "i7-security": replyWith({ findings: [LEAK] }) },
    config: { maxSpawnsPerRun: 16 },
  });
  assert.deepEqual(launchKeys(trace), [
    "sweep-1",
    "i7-claim-2",
    "i7-prep-3",
    "i7-security-4",
    "i7-save-5",
    "i7-release-6",
  ]);
  assert.deepEqual(
    summary,
    issueSummary({ stage: "fix", allocatedTokens: 940_000 }),
  );
  snapshot(trace);
});

test("a security finding past the fix rounds stops with its harm as the code", async ({
  assert: { snapshot },
}) => {
  const { trace, summary } = await finishRun({
    stage: "security",
    fields: { ...ACCEPTED, securityRounds: 2 },
    ops: PREPARED,
    agents: { "i7-security": replyWith({ findings: [LEAK] }) },
  });
  assert.deepEqual(launchKeys(trace), [
    "sweep-1",
    "i7-claim-2",
    "i7-prep-3",
    "i7-security-4",
    "i7-stop-5",
  ]);
  assert.equal(trace.at(-1).request.code, "user-harm");
  assert.deepEqual(summary, leakStopped("security"));
  snapshot(trace);
});

test("an open security finding stops the merge with its harm as the code", async ({
  assert: { snapshot },
}) => {
  const open = { ...LEAK, id: "f1", lenses: ["security"], status: "open" };
  const { trace, summary } = await finishRun({
    stage: "merge",
    fields: { ...SECURED, findings: [{ ...open, disputed: false }] },
  });
  assert.deepEqual(launchKeys(trace), ["sweep-1", "i7-claim-2", "i7-stop-3"]);
  assert.equal(trace.at(-1).request.code, "user-harm");
  assert.deepEqual(summary, leakStopped("merge"));
  snapshot(trace);
});

test("an issue at merge is merged", async ({ assert: { snapshot } }) => {
  const { trace, summary } = await finishRun({
    stage: "merge",
    fields: SECURED,
    ops: { merge: { ok: true, merged: true } },
  });
  assert.deepEqual(launchKeys(trace), ["sweep-1", "i7-claim-2", "i7-merge-3"]);
  assert.deepEqual(
    summary,
    issueSummary({
      stage: "merge",
      outcome: "merged",
      allocatedTokens: 940_000,
    }),
  );
  snapshot(trace);
});

test("a merge queued behind an older PR notes it and stays at merge", async ({
  assert: { snapshot },
}) => {
  const { trace, summary } = await finishRun({
    stage: "merge",
    fields: SECURED,
    ops: {
      merge: {
        ok: true,
        merged: false,
        reason: "queued",
        waitingFor: 5,
        waitingForPr: 40,
      },
    },
  });
  assert.deepEqual(launchKeys(trace), [
    "sweep-1",
    "i7-claim-2",
    "i7-merge-3",
    "i7-release-4",
  ]);
  assert.deepEqual(trace.at(-1).request.state.log, [
    "2026-10-15T12:00Z merge waits for #5 (older PR #40)",
  ]);
  assert.deepEqual(
    summary,
    issueSummary({ stage: "merge", allocatedTokens: 940_000 }),
  );
  snapshot(trace);
});
