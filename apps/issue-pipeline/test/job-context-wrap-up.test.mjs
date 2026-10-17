// @ts-check
// A writer's wrap-up at the context limits (wrap-up-at-175k, Axlog,
// 2026-10-17): past `soft` its one steer tells it to finish the edit it is
// in, commit it building and write the handoff as the next round's summary;
// stopped past `hard` with no handoff of its own, the job writes one for it
// and commits its uncommitted work as a WIP commit (kill-saves-writer-work)
// where that is safe. Each async test has a timeout so a session the job
// never stops fails the test instead of hanging at the fake pi's "wait".
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { test } from "node:test";
import { saveStoppedWork } from "../src/job/stop-handoff.ts";
import { turns } from "./fake-rpc-pi.mjs";
import {
  logOf,
  piCommands,
  repliesAt,
  setUp,
  startJob,
  statusOf,
} from "./job-test-kit.mjs";
import { ISSUE, sweepReply } from "./workflow-stages-fixtures.mjs";

const SOFT = 1000;
const HARD = 2000;
const LIMITS = { contextLimits: { soft: SOFT, hard: HARD } };
const PAST_SOFT = 1200;
const PAST_HARD = 2100;
const HANG_GUARD = { timeout: 60_000 };
const BRANCH = "agent/issue-7";
const SHORT_SHA = 7;
const LAST_WORDS =
  "Halfway through src/a.ts: the parser is done, its tests are not.";
const LONG_TEXT_CHARS = 5000;
const KEPT_TEXT_CHARS = 2000;
// Implement with no continuations and an exit push the fake ops makes for
// real, so the issue stops at the first handoff and the WIP commit reaches
// the origin.
const IMPLEMENT_ONCE = {
  ...repliesAt("implement"),
  sweep: sweepReply({ items: [ISSUE], config: { maxContinuations: 0 } }),
  "exit-push": { ok: true, git: true },
};
const IDENTITY = [
  "-c",
  "user.name=Test",
  "-c",
  "user.email=test@example.com",
  "-c",
  "commit.gpgsign=false",
];

/** @param {string} dir @param {readonly string[]} args @returns {string} */
function git(dir, args) {
  return execFileSync("git", ["-C", dir, ...IDENTITY, ...args], {
    encoding: "utf8",
  }).trim();
}

/** @param {number} context @param {string} text @returns {object} a turn with text */
function turnSaying(context, text) {
  const turn = /** @type {{ message: object }} */ (turns([context])[0]);
  return {
    ...turn,
    message: { ...turn.message, content: [{ type: "text", text }] },
  };
}

/** @param {import("./job-test-kit.mjs").Place} place @returns {string} */
function handoffOf(place) {
  return path.join(place.runDir, "handoff.md");
}

test(
  "a writer past soft is steered to finish its edit, commit it and write the handoff as the next round's summary",
  HANG_GUARD,
  async () => {
    const events = [
      ...turns([PAST_SOFT]),
      "wait",
      ...turns([PAST_HARD]),
      "wait",
    ];
    const place = setUp(IMPLEMENT_ONCE, { events }, LIMITS);
    const end = await startJob(place, ["--stage", "implement"]).end;
    assert.equal(end.status, 0, end.stderr);
    const steers = piCommands(place).filter(({ type }) => type === "steer");
    assert.deepEqual(
      steers.map(({ message }) => message),
      [
        `Context is at ${PAST_SOFT} tokens, past the soft limit of ${SOFT}. Wrap up now: finish the edit you are in the middle of, and don't start new ones. Make it build, and commit it. Then write ${handoffOf(place)} as a summary for the next round: what is done; what is left, in order; the decisions you made and why; the traps and dead ends you found; and the branch state, with the last commit and whether the checks pass. The next session starts from this summary alone. Then return status \`handoff\`. At ${HARD} tokens this session is stopped.`,
      ],
    );
  },
);

test(
  "a writer stopped at hard with no handoff gets one from the job, and its uncommitted work a WIP commit that reaches the branch",
  HANG_GUARD,
  async () => {
    const events = [turnSaying(PAST_HARD, LAST_WORDS), "wait"];
    const script = { events, commit: "a.txt", untracked: "left.txt" };
    const place = setUp(IMPLEMENT_ONCE, script, LIMITS);
    const end = await startJob(place, ["--stage", "implement"]).end;
    assert.equal(end.status, 0, end.stderr);
    const handoff = fs.readFileSync(handoffOf(place), "utf8");
    assert.ok(
      handoff.startsWith(
        "# Handoff: the session was stopped before it wrote its summary",
      ),
      handoff,
    );
    assert.ok(handoff.includes(`at ${PAST_HARD} tokens of context`), handoff);
    // The session's commit, its uncommitted file and its last words.
    const [committed = ""] = logOf(place, "pi.log")
      .filter((line) => "committed" in line)
      .map(({ committed: sha }) => String(sha));
    assert.ok(handoff.includes(`${committed.slice(0, SHORT_SHA)}`), handoff);
    assert.ok(handoff.includes(" work\n"), handoff);
    assert.ok(handoff.includes("?? left.txt"), handoff);
    assert.ok(handoff.includes(LAST_WORDS), handoff);
    assert.ok(handoff.includes("WIP commit"), handoff);
    // The WIP commit holds the uncommitted file, on top of the session's.
    const subjects = git(place.origin, ["log", "--format=%s", BRANCH]);
    assert.ok(subjects.startsWith("WIP: work i7-implement-"), subjects);
    const show = ["show", "--name-only", "--format=", BRANCH];
    assert.equal(git(place.origin, show), "left.txt");
    assert.deepEqual(statusOf(place).lostChanges, []);
  },
);

/** @typedef {{ dir: string, handoffFile: string, head: string }} Repo */

/** @returns {Repo} a repo on the issue's branch with one commit */
function repo() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "issue-pipeline-wrap-"));
  process.on("exit", () => fs.rmSync(tmp, { recursive: true, force: true }));
  const dir = path.join(tmp, "work");
  fs.mkdirSync(dir);
  git(dir, ["init", "--quiet", "-b", BRANCH]);
  git(dir, ["config", "user.name", "Job"]);
  git(dir, ["config", "user.email", "job@example.com"]);
  git(dir, ["config", "commit.gpgsign", "false"]);
  fs.writeFileSync(path.join(dir, "a.txt"), "base\n");
  git(dir, ["add", "a.txt"]);
  git(dir, ["commit", "--quiet", "-m", "base"]);
  const head = git(dir, ["rev-parse", "HEAD"]);
  return { dir, handoffFile: path.join(tmp, "handoff.md"), head };
}

// The job's save for a writer in `at` stopped at hard, whose handoff file
// held `handoff` as it started.
/** @param {Repo} at @param {string | null} handoff */
function stopIn(at, handoff) {
  const place = { cwd: at.dir, handoffFile: at.handoffFile };
  return saveStoppedWork(place, {
    key: "i7-implement-1",
    stop: { context: PAST_HARD },
    lastText: "x".repeat(LONG_TEXT_CHARS),
    start: { head: at.head, handoff },
  });
}

/** @param {string} file @returns {string} */
function read(file) {
  return fs.readFileSync(file, "utf8");
}

test("a stopped writer's own handoff is kept, and its work left to it", () => {
  const at = repo();
  fs.writeFileSync(path.join(at.dir, "a.txt"), "edited\n");
  fs.writeFileSync(at.handoffFile, "## Done\nThe parser.\n");
  const saved = stopIn(at, null);
  assert.deepEqual(saved, { wroteHandoff: false, wipCommit: null });
  assert.equal(read(at.handoffFile), "## Done\nThe parser.\n");
  assert.equal(git(at.dir, ["status", "--short"]), "M a.txt");
});

test("a handoff left as the session found it is replaced, with the last text cut to 2000 characters", () => {
  const at = repo();
  fs.writeFileSync(at.handoffFile, "an earlier round's handoff\n");
  const saved = stopIn(at, "an earlier round's handoff\n");
  assert.deepEqual(saved, { wroteHandoff: true, wipCommit: null });
  const handoff = read(at.handoffFile);
  assert.ok(handoff.includes("x".repeat(KEPT_TEXT_CHARS)), handoff);
  assert.equal(handoff.includes("x".repeat(KEPT_TEXT_CHARS + 1)), false);
  assert.ok(handoff.includes("Nothing uncommitted."), handoff);
});

test("no WIP commit mid-rebase, or when the commit hooks refuse it; the handoff says why", () => {
  const rebasing = repo();
  fs.writeFileSync(path.join(rebasing.dir, "a.txt"), "edited\n");
  fs.mkdirSync(path.join(rebasing.dir, ".git", "rebase-merge"));
  assert.equal(stopIn(rebasing, null).wipCommit, null);
  assert.ok(read(rebasing.handoffFile).includes("rebase-merge"));
  assert.equal(git(rebasing.dir, ["log", "--format=%s"]), "base");
  const hooked = repo();
  fs.writeFileSync(path.join(hooked.dir, "b.txt"), "new\n");
  const hook = path.join(hooked.dir, ".git", "hooks", "pre-commit");
  fs.writeFileSync(hook, "#!/bin/sh\nexit 1\n", { mode: 0o755 });
  assert.equal(stopIn(hooked, null).wipCommit, null);
  assert.ok(read(hooked.handoffFile).includes("hooks refused it"));
  assert.equal(git(hooked.dir, ["status", "--short"]), "?? b.txt");
});
