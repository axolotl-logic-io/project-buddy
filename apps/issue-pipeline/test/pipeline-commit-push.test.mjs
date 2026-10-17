// @ts-check
// pipeline_commit end to end, in-process against bare remotes: a real job
// checkout (openJobCheckout), the job's control socket serving pushes
// (openControl with pushServerOf), and the tool's default export registered
// on a fake pi API (Pipeline-Roles-Shared, "pipeline_commit").
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { test } from "node:test";
import { BASE, refOf, seedOrigins } from "./job-git-test-kit.mjs";
import { setEnv } from "./ops-run-test-kit.mjs";

/** @import { Config } from "../src/config.ts" */
/** @import { StageName } from "../src/workflow/stages/types.ts" */

const root = fs.mkdtempSync(path.join(os.tmpdir(), "pipeline-commit-push-"));
process.on("exit", () => fs.rmSync(root, { recursive: true, force: true }));
setEnv("ISSUE_PIPELINE_ROOT", root);
const { loadConfig, paths } = await import("../src/config.ts");
const { closeJobCheckout, openJobCheckout } = await import(
  "../src/job/checkout.ts"
);
const { openControl } = await import("../src/job/control.ts");
const { pushServerOf } = await import("../src/job/commit-push.ts");
const { openStatus, readStatus } = await import("../src/job/status.ts");
const { COMMIT_SCOPE_ENV, commitEnvOf } = await import(
  "../src/job/pipeline-commit.ts"
);
const { commitScopeOf, STAGE_WIKI_ACCESS } = await import(
  "../src/job/roles.ts"
);
const { default: pipelineCommit } = await import(
  "../src/job/pipeline-commit-tool.ts"
);

const ISSUE = 7;
const BRANCH = "refs/heads/agent/issue-7";
const PUSHED_BRANCH = "origin/agent/issue-7";
const KEY = "i7-launch-1";
const REFUSED_PUSH = /code push failed/u;
const NOTHING_COMMITTED = /git exited 1: .*nothing/su;
const HOOK_REFUSES = /pipeline_commit/u;
const REFUSE_ALL = "#!/bin/sh\nexit 1\n";
const HOOK_MODE = 0o755;
const ZERO = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
// A sequence editor that stops the rebase at once, as a stopped rebase would.
const BREAK_ENV = Object.fromEntries([
  ["GIT_SEQUENCE_EDITOR", "sh -c 'echo break > \"$1\"' --"],
]);
// The variable the checkouts' pre-commit hook lets a commit through with.
const COMMIT_PASS = Object.fromEntries([["ISSUE_PIPELINE_COMMIT", "1"]]);

/**
 * One stage job's checkout, its control socket and its registered tool.
 * @typedef {{ cfg: Config, dir: string, wikiDir: string, origin: string, wikiOrigin: string, runDir: string, commit: (args: string[]) => Promise<any>, close: () => void }} Job
 */

let repos = 0;

/**
 * git's trimmed stdout in `dir`.
 * @param {string} dir
 * @param {readonly string[]} args
 * @param {Record<string, string>} [env]
 * @returns {string}
 */
function git(dir, args, env = {}) {
  return execFileSync("git", ["-C", dir, ...args], {
    encoding: "utf8",
    env: { ...process.env, ...env },
  }).trim();
}

/** @param {string} tmp @returns {Config} a config of a repo of its own */
function configIn(tmp) {
  repos += 1;
  const origins = seedOrigins(tmp, true);
  const file = path.join(tmp, "config.json");
  const config = {
    repo: `o/r${repos}`,
    account: "bot",
    allowedUsers: ["alice"],
    commands: { test: "true" },
    ...origins.config,
  };
  fs.writeFileSync(file, JSON.stringify(config));
  return loadConfig(file);
}

// The tool pipelineCommit registers on a fake pi API.
/** @returns {any} */
function registeredTool() {
  /** @type {any[]} */
  const tools = [];
  pipelineCommit({ registerTool: (tool) => tools.push(tool) });
  return tools[0];
}

// Opens a job of `stage` for #7 of a repo of its own, with a wiki, whose
// launch KEY has started.
/** @param {StageName} stage @returns {Promise<Job>} */
async function openJob(stage) {
  const tmp = fs.mkdtempSync(path.join(root, "repo-"));
  const cfg = configIn(tmp);
  const wiki = STAGE_WIKI_ACCESS[stage];
  const dir = openJobCheckout(cfg, ISSUE, { stage, stackOn: null, wiki });
  const runDir = paths.runDir(cfg, ISSUE);
  const job = { issue: ISSUE, stage, checkout: dir };
  const status = openStatus(runDir, { ...job, lane: null, socket: "" });
  const server = pushServerOf(cfg, job, status.pushed);
  const control = await openControl(runDir, server);
  status.started({
    key: KEY,
    kind: "session",
    pid: null,
    session: null,
    resumed: false,
    usage: ZERO,
    tokenBudget: null,
  });
  const scope = { socket: control.socket, key: KEY, checkout: dir };
  const env = commitEnvOf({ ...scope, ...commitScopeOf(stage, "wiki") });
  const tool = registeredTool();
  return {
    cfg,
    dir,
    wikiDir: path.join(dir, "wiki"),
    origin: path.join(tmp, "origin.git"),
    wikiOrigin: path.join(tmp, "wiki-origin.git"),
    runDir,
    commit: async (args) => {
      setEnv(COMMIT_SCOPE_ENV, env[COMMIT_SCOPE_ENV] ?? "");
      return await tool.execute("call", { args });
    },
    close: () => control.close(),
  };
}

/** @param {Job} job @returns {{ repo: string, sha: string }[]} */
function pushesOf(job) {
  const pushes = readStatus(job.runDir)?.launches[0]?.pushes ?? [];
  return pushes.map(({ repo, sha }) => ({ repo, sha }));
}

/** @param {string} dir @param {string} file @param {string} text */
function write(dir, file, text) {
  fs.writeFileSync(path.join(dir, file), text);
}

/** @param {string} dir @returns {string} */
function headOf(dir) {
  return git(dir, ["rev-parse", "HEAD"]);
}

test("code and a new wiki page make two commits with one message, and both are pushed", async () => {
  const job = await openJob("spec");
  try {
    write(job.dir, "README.md", "changed\n");
    write(job.wikiDir, "Page.md", "new\n");
    const result = await job.commit(["-am", "Add the page"]);
    assert.equal(result.isError, false);
    assert.equal(result.details.pushed, "both");
    assert.equal(result.details.pushError, null);
    assert.equal(refOf(job.origin, BRANCH), headOf(job.dir));
    assert.equal(refOf(job.wikiOrigin, BRANCH), headOf(job.wikiDir));
    for (const dir of [job.dir, job.wikiDir]) {
      assert.equal(git(dir, ["log", "-1", "--format=%s"]), "Add the page");
    }
    assert.deepEqual(pushesOf(job), [
      { repo: "code", sha: headOf(job.dir) },
      { repo: "wiki", sha: headOf(job.wikiDir) },
    ]);
  } finally {
    job.close();
  }
});

test("a wiki-only change pushes only the wiki", async () => {
  const job = await openJob("spec");
  try {
    write(job.wikiDir, "Page.md", "new\n");
    const result = await job.commit(["-m", "Wiki page", "--", "wiki/Page.md"]);
    assert.equal(result.details.pushed, "wiki");
    assert.equal(result.details.code, null);
    assert.equal(refOf(job.origin, BRANCH), "");
    assert.equal(refOf(job.wikiOrigin, BRANCH), headOf(job.wikiDir));
  } finally {
    job.close();
  }
});

test("nothing to commit fails with git's exit code and pushes nothing", async () => {
  const job = await openJob("implement");
  try {
    const result = await job.commit(["-am", "Nothing"]);
    assert.equal(result.isError, true);
    assert.equal(result.details.code.exitCode, 1);
    assert.match(result.content[0].text, NOTHING_COMMITTED);
    assert.equal(refOf(job.origin, BRANCH), "");
    assert.deepEqual(pushesOf(job), []);
  } finally {
    job.close();
  }
});

test("read wiki access commits code only, and the wiki edit is lost at teardown", async () => {
  const job = await openJob("implement");
  try {
    write(job.dir, "README.md", "changed\n");
    write(job.wikiDir, "Page.md", "new\n");
    const result = await job.commit(["-am", "Code"]);
    assert.equal(result.details.pushed, "code");
    assert.equal(result.details.wiki, null);
    assert.equal(refOf(job.wikiOrigin, BRANCH), "");
  } finally {
    job.close();
  }
  const lost = await closeJobCheckout(
    job.cfg,
    ISSUE,
    { dir: job.dir, wiki: "read" },
    null,
  );
  assert.deepEqual(lost, ["wiki/Page.md"]);
});

test("a refused push keeps the commit and reports it, and the next call pushes both commits", async () => {
  const job = await openJob("implement");
  const hook = path.join(job.origin, "hooks", "pre-receive");
  try {
    fs.writeFileSync(hook, REFUSE_ALL, { mode: HOOK_MODE });
    write(job.dir, "README.md", "first\n");
    const first = await job.commit(["-am", "First"]);
    assert.equal(first.isError, false);
    assert.equal(first.details.pushed, "none");
    assert.match(first.details.pushError, REFUSED_PUSH);
    assert.equal(typeof first.details.code.sha, "string");
    assert.equal(refOf(job.origin, BRANCH), "");
    fs.rmSync(hook);
    write(job.dir, "README.md", "second\n");
    const second = await job.commit(["-am", "Second"]);
    assert.equal(second.details.pushed, "code");
    assert.equal(second.details.pushError, null);
    assert.equal(refOf(job.origin, BRANCH), headOf(job.dir));
    const below = ["log", "-1", "--format=%s", `${PUSHED_BRANCH}~1`];
    assert.equal(git(job.dir, below), "First");
  } finally {
    job.close();
  }
});

test("a commit during a stopped rebase is deferred and the remote is unchanged", async () => {
  const job = await openJob("implement");
  try {
    git(job.dir, ["rebase", "-i", `origin/${BASE}`], BREAK_ENV);
    write(job.dir, "README.md", "mid-rebase\n");
    const result = await job.commit(["-am", "Mid rebase"]);
    assert.equal(result.isError, false);
    assert.equal(result.details.pushed, "deferred");
    assert.equal(typeof result.details.code.sha, "string");
    assert.equal(refOf(job.origin, BRANCH), "");
    assert.deepEqual(pushesOf(job), []);
  } finally {
    job.close();
  }
});

test("a plain git commit is refused in the code and wiki checkouts, and passes with ISSUE_PIPELINE_COMMIT=1", async () => {
  const job = await openJob("spec");
  try {
    for (const dir of [job.dir, job.wikiDir]) {
      const args = ["-C", dir, "commit", "--allow-empty", "-m", "Direct"];
      const refused = spawnSync("git", args, { encoding: "utf8" });
      assert.notEqual(refused.status, 0, dir);
      assert.match(refused.stderr, HOOK_REFUSES);
      const passed = spawnSync("git", args, {
        encoding: "utf8",
        env: { ...process.env, ...COMMIT_PASS },
      });
      assert.equal(passed.status, 0, passed.stderr);
    }
  } finally {
    job.close();
  }
});

test("a checkout opened with no wiki access holds no wiki checkout", () => {
  const tmp = fs.mkdtempSync(path.join(root, "repo-"));
  const cfg = configIn(tmp);
  const dir = openJobCheckout(cfg, ISSUE, {
    stage: "implement",
    stackOn: null,
    wiki: "none",
  });
  assert.ok(fs.existsSync(path.join(dir, ".git")));
  assert.ok(!fs.existsSync(path.join(dir, "wiki")));
});
