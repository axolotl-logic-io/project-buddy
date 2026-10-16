// The issue branch's pushes: only the ops CLI pushes, and it records each
// push in the issue's run directory first, so a later claim on this machine
// knows the head as the pipeline's own.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { assertClean, head } from "./checkouts.ts";
import type { Config } from "./config.ts";
import { paths, wikiCfg } from "./config.ts";
import { git } from "./github.ts";
import { OpsError, run } from "./process.ts";

const PUSHED_FILE = "pushed.json";
// The part of the push record a claim reads.
const PUSHED = z.object({ sha: z.string(), op: z.string() });

// A head the pipeline pushed for an issue, and the op that pushed it.
interface PushRecord {
  sha: string;
  op: string;
}

// Records in the issue's run directory that `op` is pushing `sha` as the
// branch's head, replacing the last record, so a later claim on this machine
// knows that head as the pipeline's own push.
function recordPush(cfg: Config, n: number, sha: string, op: string): void {
  const dir = paths.runDir(cfg, n);
  fs.mkdirSync(dir, { recursive: true });
  const record = { sha, op, at: new Date().toISOString() };
  fs.writeFileSync(path.join(dir, PUSHED_FILE), `${JSON.stringify(record)}\n`);
}

// The head this machine last recorded pushing for the issue and the op that
// pushed it, or null when it has no readable record.
function lastPush(cfg: Config, n: number): PushRecord | null {
  const file = path.join(paths.runDir(cfg, n), PUSHED_FILE);
  try {
    const { sha, op } = PUSHED.parse(JSON.parse(fs.readFileSync(file, "utf8")));
    return { sha, op };
  } catch {
    return null;
  }
}

// Pushes the issue's branch for `op`, recording the push first, and returns
// its head. allowEmpty lets start-pr push the branch's empty first commit.
// Every other push must change files, since that commit alone puts the branch
// ahead of the base.
function push(
  cfg: Config,
  number: number,
  op: string,
  { allowEmpty = false }: { allowEmpty?: boolean } = {},
): string {
  const wt = paths.worktree(cfg, number);
  assertClean(wt, "worktree");
  const wiki = paths.wiki(cfg, number);
  if (wikiCfg(cfg) !== null && fs.existsSync(path.join(wiki, ".git"))) {
    assertClean(wiki, "the wiki checkout");
  }
  const base = `origin/${cfg.baseBranch}`;
  const count = ["-C", wt, "rev-list", "--count", `${base}..HEAD`];
  const ahead = Number(run("git", count).stdout.trim());
  if (!(ahead > 0)) {
    throw new OpsError("branch has no commits ahead of the base branch");
  }
  const diff = ["-C", wt, "diff", "--quiet", `${base}...HEAD`];
  if (allowEmpty !== true && run("git", diff, { allowFail: true }).code === 0) {
    throw new OpsError("branch changes no files against the base branch");
  }
  const target = `HEAD:refs/heads/${paths.branch(number)}`;
  recordPush(cfg, number, head(wt), op);
  git(cfg, ["-C", wt, "push", "--force-with-lease", "-u", "origin", target]);
  return head(wt);
}

export type { PushRecord };
export { lastPush, push, recordPush };
