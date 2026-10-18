// What finish-sync checks a rebase a writer resolved against, before it
// pushes it, and the push and reset that sync-base and finish-sync share
// (sync.ts).

import { recordPush } from "../checkouts.ts";
import type { Config } from "../config.ts";
import { paths } from "../config.ts";
import { head, remoteHead } from "../git-state.ts";
import { git } from "../github.ts";
import { run } from "../process.ts";
import { abortRebase, rebaseProblem } from "../rebase.ts";
import type { StackedOn } from "../stack.ts";
import { measureFrom } from "../stack.ts";
import { holdWikiPin } from "../wiki.ts";

// The commit sync-base rebased onto (its reply's baseSha, #279) and what the
// branch is stacked on after that sync.
interface FinishAgainst {
  baseSha?: string | null | undefined;
  stackedOn?: StackedOn | null | undefined;
}

// Why the resolved rebase in `wt` can't be pushed, or undefined when it can.
// A stacked branch is checked against the prerequisite head its sync
// targeted. Otherwise, with a baseSha it is checked against that commit,
// which must be on the base, so a base that moved during the fix doesn't
// throw the resolution away.
function finishProblem(
  cfg: Config,
  wt: string,
  { baseSha, stackedOn }: FinishAgainst,
): string | undefined {
  if (stackedOn !== null && stackedOn !== undefined) {
    return rebaseProblem(wt, measureFrom(stackedOn, cfg));
  }
  const base = `origin/${cfg.baseBranch}`;
  if (baseSha === null || baseSha === undefined || baseSha === "") {
    return rebaseProblem(wt, base);
  }
  const ancestor = ["-C", wt, "merge-base", "--is-ancestor", baseSha, base];
  if (run("git", ancestor, { allowFail: true }).code !== 0) {
    return `${baseSha} is not on ${base}`;
  }
  return rebaseProblem(wt, baseSha);
}

// Puts the worktree back on the pushed branch, dropping a half-done rebase.
function resetToRemote(cfg: Config, n: number): void {
  const wt = paths.worktree(cfg, n);
  abortRebase(wt);
  const remote = remoteHead(cfg, n);
  if (remote !== null) {
    run("git", ["-C", wt, "reset", "--hard", remote]);
  }
  run("git", ["-C", wt, "clean", "-fd"]);
  holdWikiPin(cfg, wt);
}

// Pushes the worktree's head as the issue's branch for `op`, recording the
// push first.
function pushBranch(cfg: Config, n: number, wt: string, op: string): void {
  const target = `HEAD:refs/heads/${paths.branch(n)}`;
  recordPush(cfg, n, head(wt), op);
  git(cfg, ["-C", wt, "push", "--force-with-lease", "origin", target]);
}

export { finishProblem, pushBranch, resetToRemote };
