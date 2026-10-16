// @ts-check
// The code and wiki flows across the stages (#217), driven through each
// stage's step machine with recorded replies: a fix that adds code reopens a
// wiki-only issue's closed PR, checks run wiki-check first and skip verify and
// CI for a wiki-only change, sync saves the flows a rebase reports, and merge
// finishes a wiki-only change through finish-wiki.
import assert from "node:assert/strict";
import { test } from "node:test";
import { next as checks } from "../src/workflow/stages/checks.ts";
import { next as fix } from "../src/workflow/stages/fix.ts";
import { next as merge } from "../src/workflow/stages/merge.ts";
import { next as sync } from "../src/workflow/stages/sync.ts";
import { opsRequests, sessions } from "./stage-outcome-test-kit.mjs";
import { CTX, replied, stateAt } from "./workflow-checks-test-kit.mjs";
import { stateWith } from "./workflow-finish-test-kit.mjs";
import { fixState, round } from "./workflow-fix-test-kit.mjs";

/** @import { Step } from "../src/workflow/stages/types.ts" */

const WIKI = { code: false, wiki: true };
const BOTH = { code: true, wiki: true };
const HEAD = "dddddddddddddddd";
const CLOSED_PR = 42;
const REOPENED_PR = 44;
const WIKI_PASS = { ok: true, pass: true, checks: [] };
const BROKEN = {
  id: "wiki-link:Home.md:Gone",
  pass: false,
  detail: "Home.md links to Gone, which is not a page on the wiki branch",
};
const WIKI_FAIL = { ok: true, pass: false, checks: [BROKEN] };

/** @param {Step} step @returns {string[]} */
function opsOf(step) {
  return opsRequests(step).map(({ op }) => op);
}

test("a fix that adds code to a wiki-only issue reopens its PR, then prepares the re-review", () => {
  const given = fixState(undefined, {
    flows: WIKI,
    prClosed: true,
    pr: CLOSED_PR,
  });
  const { fixed } = round(given);
  const reply = { ok: true, headSha: HEAD, codeChanged: true, wikiAhead: 1 };
  const pushed = replied(fix, fixed, reply);
  const [{ op, payload: { reopen } = {} } = { op: "" }] = opsRequests(pushed);
  assert.deepEqual({ op, reopen }, { op: "open-pr", reopen: CLOSED_PR });
  const opened = { ok: true, pr: REOPENED_PR, headSha: HEAD };
  const prepared = replied(fix, pushed, { ...opened, codeChanged: true });
  assert.deepEqual(opsOf(prepared), ["prepare-review"]);
  const { pr, prClosed, flows } = prepared.state.st;
  assert.deepEqual(
    { pr, prClosed, flows },
    { pr: REOPENED_PR, prClosed: false, flows: BOTH },
  );
});

test("checks of a wiki-only change run only wiki-check, and a pass goes to accept", () => {
  const begun = checks(
    stateAt("checks", { flows: WIKI, prClosed: true }),
    CTX,
    [],
  );
  assert.deepEqual(opsOf(begun), ["wiki-check"]);
  const step = replied(checks, begun, WIKI_PASS);
  assert.equal(step.done, true);
  assert.equal(step.stop, null);
  assert.equal(step.state.st.stage, "accept");
});

test("a failed wiki-check starts a CI fix with the failure as a failed test reads", () => {
  const begun = checks(stateAt("checks", { flows: WIKI }), CTX, []);
  const step = replied(checks, begun, WIKI_FAIL);
  const [fixer] = sessions(step);
  assert.ok(fixer?.task.includes(`- ${BROKEN.id}: ${BROKEN.detail}`));
  assert.equal(step.state.st.ciFixes, 1);
});

test("checks of a change to code and the wiki run wiki-check, then verify", () => {
  const begun = checks(stateAt("checks", { flows: BOTH }), CTX, []);
  assert.deepEqual(opsOf(begun), ["wiki-check"]);
  assert.deepEqual(opsOf(replied(checks, begun, WIKI_PASS)), ["verify"]);
});

test("checks of a code-only change verify first, as before", () => {
  const flows = { code: true, wiki: false };
  assert.deepEqual(opsOf(checks(stateAt("checks", { flows }), CTX, [])), [
    "verify",
  ]);
});

test("a clean sync that changed nothing stops as not doable", () => {
  const begun = sync(stateAt("sync"), CTX, []);
  const clean = { ok: true, changed: false, conflict: false, headSha: HEAD };
  const step = replied(sync, begun, {
    ...clean,
    codeChanged: false,
    wikiAhead: 0,
  });
  assert.equal(step.stop?.reason, "the implementation changed nothing");
});

test("a clean sync of a wiki-only change records its flows and goes to checks", () => {
  const begun = sync(stateAt("sync", { prClosed: true }), CTX, []);
  const clean = { ok: true, changed: false, conflict: false, headSha: HEAD };
  const step = replied(sync, begun, {
    ...clean,
    codeChanged: false,
    wikiAhead: 1,
  });
  assert.equal(step.stop, null);
  assert.deepEqual(step.state.st.flows, WIKI);
  assert.equal(step.state.st.stage, "checks");
});

test("merge finishes a wiki-only change through finish-wiki, and ends merged", () => {
  const fields = { flows: WIKI, prClosed: true };
  const checked = stateWith("merge", fields, { phase: "wiki-checked" });
  const asked = merge(checked, CTX, [{ kind: "op", reply: WIKI_PASS }]);
  assert.deepEqual(opsOf(asked), ["finish-wiki"]);
  const reply = { ok: true, merged: true, published: true, sha: "c0ffee" };
  const step = replied(merge, asked, reply);
  assert.equal(step.done, true);
  assert.equal(step.state.outcome, "merged");
});
