// @ts-check
// A stage job's folder holds its code checkout, repo/, and its wiki
// checkout, docs/, side by side (separate-checkouts, #338); every stage gets
// docs/ (every-role-reads-wiki), and teardown finds the work left in either
// (Running-the-Issue-Pipeline, "Stage jobs").
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { messageEnd, outputEnd } from "./fake-rpc-pi.mjs";
import { checkoutOf, docsOf, repoOf } from "./job-git-test-kit.mjs";
import {
  logOf,
  piStarts,
  READY_SPEC,
  repliesAt,
  runJob,
  SPEC_SESSION,
  setUp,
  startJob,
  statusOf,
  USAGE,
  waitFor,
} from "./job-test-kit.mjs";

/** @import { Place } from "./job-test-kit.mjs" */

const ISSUE = 7;
// A session that waits until it is stopped.
const WAITING = { events: [messageEnd(USAGE), "wait", outputEnd(READY_SPEC)] };
// The structured output of a triage agent that finds the issue ready.
const READY_TRIAGE = {
  decision: "ready",
  reason: "Small.",
  questions: [],
  plan: "Change src/a.ts and test it.",
};
const EXIT_PUSH = { "exit-push": { ok: true } };

/** @param {Place} place @returns {boolean} whether a launch spent tokens */
function spent(place) {
  const launches = statusOf(place)?.launches ?? [];
  return launches.some((/** @type {any} */ launch) => launch.usage.input > 0);
}

/** @param {Place} place @returns {any[]} the exit-push requests */
function pushes(place) {
  return logOf(place, "ops.log").filter(({ op }) => op === "exit-push");
}

for (const stage of ["spec", "implement"]) {
  test(`the ${stage} job's folder holds repo/ and docs/ side by side, and is its session's cwd`, async () => {
    const place = setUp(repliesAt(stage), WAITING, {}, { wiki: true });
    const job = startJob(place, ["--stage", stage]);
    await waitFor(() => spent(place));
    const root = checkoutOf(place.root, stage);
    const repo = repoOf(place.root, stage);
    try {
      assert.ok(fs.existsSync(path.join(repo, ".git")));
      assert.ok(fs.existsSync(path.join(docsOf(place.root, stage), ".git")));
      assert.equal(fs.existsSync(path.join(root, ".git")), false);
      const exclude = path.join(repo, ".git", "info", "exclude");
      const lines = fs.readFileSync(exclude, "utf8").split("\n");
      assert.deepEqual(
        lines.filter((line) => line.includes("docs") || line.includes("wiki")),
        [],
      );
      const [start] = piStarts(place);
      const realRoot = checkoutOf(fs.realpathSync(place.root), stage);
      assert.equal(start.cwd, realRoot);
    } finally {
      job.child.kill("SIGTERM");
      await job.end;
    }
    assert.equal(fs.existsSync(root), false);
  });
}

test("a triage job gets docs/ to read, and its edits there are lost as docs/ paths", () => {
  const place = setUp(
    repliesAt("triage"),
    {
      untracked: "docs/Page.md",
      events: [messageEnd(USAGE), outputEnd(READY_TRIAGE)],
    },
    {},
    { wiki: true },
  );
  const r = runJob(place, ["--stage", "triage"]);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(statusOf(place).lostChanges, ["docs/Page.md"]);
  assert.equal(fs.existsSync(checkoutOf(place.root, "triage")), false);
});

test("an implement job whose only commit is in docs/ still runs its exit push", () => {
  const place = setUp(
    { ...repliesAt("implement"), ...EXIT_PUSH },
    { ...SPEC_SESSION, commit: "docs/Page.md" },
    {},
    { wiki: true },
  );
  const r = runJob(place, ["--stage", "implement"]);
  assert.equal(r.status, 0, r.stderr);
  const [push] = pushes(place);
  assert.deepEqual(push?.checkout, {
    issue: ISSUE,
    dir: repoOf(place.root, "implement"),
  });
  assert.deepEqual(statusOf(place).lostChanges, []);
});
