// The wiki is a submodule of the code checkout. With wiki publishing enabled,
// each issue works on its own wiki branch; review includes its commits and
// wiki-publish.ts publishes them after the code merges.

import fs from "node:fs";
import path from "node:path";
import { configureClone, updateSubmodules } from "./clone-setup.ts";
import type { Config, WikiSettings } from "./config.ts";
import { paths, wikiCfg } from "./config.ts";
import { uncommitted } from "./git-state.ts";
import { git } from "./github.ts";
import { withCloneLock, withWikiLock } from "./locks.ts";
import { run } from "./process.ts";

interface WikiDiff {
  diff: string;
  files: string[];
}

// `git ls-files --stage` of a merged gitlink: mode, commit, stage 0, path.
const MERGED_GITLINK = /^160000 [0-9a-f]+ 0\t/u;

function gitIn(dir: string, args: readonly string[]): string {
  return run("git", ["-C", dir, ...args]).stdout;
}

// Keeps the wiki checkout's moving HEAD out of the pipeline's code checkout
// `parent`: its status and `git add -A` leave the wiki gitlink alone, while a
// staged pin still shows. It marks the gitlink assume-unchanged, a mark git
// drops whenever it writes the gitlink's index entry anew, as a rebase,
// reset or checkout that changes or replays the pin does (#458), so the sync,
// push and job exit paths call it again before they check or stage. Does
// nothing without a wiki submodule, or while its gitlink is unmerged.
// Ordinary developer checkouts keep Git's default pin tracking.
function holdWikiPin(cfg: Config, parent: string): void {
  const wiki = wikiCfg(cfg);
  if (wiki === null) {
    return;
  }
  const entry = gitIn(parent, ["ls-files", "--stage", "--", wiki.dir]);
  if (MERGED_GITLINK.test(entry)) {
    gitIn(parent, ["update-index", "--assume-unchanged", "--", wiki.dir]);
  }
}

// The initialized wiki submodule, or null when this checkout declares none.
// Wiki commits are published separately, so its gitlink is held (holdWikiPin).
function wikiCheckout(cfg: Config, parent: string): string | null {
  const wiki = wikiCfg(cfg);
  if (wiki === null) {
    return null;
  }
  const dir = path.join(parent, wiki.dir);
  const entry = gitIn(parent, ["ls-files", "--stage", "--", wiki.dir]);
  if (!entry.startsWith("160000 ")) {
    return null;
  }
  if (!fs.existsSync(path.join(dir, ".git"))) {
    updateSubmodules(cfg, parent);
  }
  holdWikiPin(cfg, parent);
  configureClone(cfg, dir);
  git(cfg, ["-C", dir, "fetch", "--prune", "origin"]);
  return dir;
}

// True when the wiki remote's issue branch has unpublished commits.
function wikiBranchWork(wiki: WikiSettings, dir: string, n: number): boolean {
  const ref = `refs/remotes/origin/${paths.branch(n)}`;
  const verify = ["-C", dir, "rev-parse", "--verify", "--quiet", ref];
  if (run("git", verify, { allowFail: true }).code !== 0) {
    return false;
  }
  const range = `origin/${wiki.branch}..${ref}`;
  return Number(gitIn(dir, ["rev-list", "--count", range]).trim()) > 0;
}

// False with no configured wiki submodule or no unpublished issue branch.
function wikiBranchHasWork(cfg: Config, n: number): boolean {
  const wiki = wikiCfg(cfg);
  if (wiki === null) {
    return false;
  }
  return withWikiLock(cfg, () => {
    const dir = withCloneLock(cfg, () => wikiCheckout(cfg, paths.clone(cfg)));
    return dir !== null && wikiBranchWork(wiki, dir, n);
  });
}

// How many commits the issue's wiki checkout has that the wiki doesn't.
function wikiAhead(cfg: Config, n: number): number {
  const dir = paths.wiki(cfg, n);
  const wiki = wikiCfg(cfg);
  if (wiki === null || !fs.existsSync(path.join(dir, ".git"))) {
    return 0;
  }
  const range = `origin/${wiki.branch}..HEAD`;
  return Number(gitIn(dir, ["rev-list", "--count", range]).trim());
}

// Readies the existing wiki submodule for this issue, preserving local work.
// A clean checkout with no commits of its own resumes the remote issue branch
// when that has work, or starts at the wiki's latest published version.
function ensureWiki(cfg: Config, n: number): string | null {
  const wiki = wikiCfg(cfg);
  if (wiki === null) {
    return null;
  }
  return withWikiLock(cfg, () => {
    const dir = withCloneLock(cfg, () =>
      wikiCheckout(cfg, paths.worktree(cfg, n)),
    );
    if (dir === null) {
      return null;
    }
    let base = `origin/${wiki.branch}`;
    if (wikiBranchWork(wiki, dir, n)) {
      base = `origin/${paths.branch(n)}`;
    }
    if (
      wikiAhead(cfg, n) === 0 &&
      gitIn(dir, ["status", "--porcelain"]).trim() === ""
    ) {
      gitIn(dir, ["checkout", "-B", paths.branch(n), base]);
    }
    return paths.wiki(cfg, n);
  });
}

// Keeps the issue's wiki commits on the wiki remote's agent/issue-<n>. Does
// nothing when the checkout has no commits of its own; a failed push throws.
function pushWikiBranch(cfg: Config, n: number): void {
  if (wikiAhead(cfg, n) === 0) {
    return;
  }
  const dir = paths.wiki(cfg, n);
  const target = `HEAD:refs/heads/${paths.branch(n)}`;
  withWikiLock(cfg, () =>
    git(cfg, ["-C", dir, "push", "--force-with-lease", "origin", target]),
  );
}

// The wiki's part of a review diff: every wiki commit the issue made so far.
function wikiDiff(cfg: Config, n: number): WikiDiff {
  const wiki = wikiCfg(cfg);
  if (wiki === null || wikiAhead(cfg, n) === 0) {
    return { diff: "", files: [] };
  }
  const dir = paths.wiki(cfg, n);
  const range = `origin/${wiki.branch}...HEAD`;
  const diff = gitIn(dir, ["diff", "--stat", "--patch", range]);
  const files = gitIn(dir, ["diff", "--name-only", range])
    .split("\n")
    .filter((file) => file !== "")
    .map((file) => `${wiki.dir}/${file}`);
  return { diff, files };
}

// Why the wiki checkout holds unpublished work, or null when it holds none.
function unsavedWiki(cfg: Config, n: number): string | null {
  const wiki = wikiCfg(cfg);
  const dir = paths.wiki(cfg, n);
  if (wiki === null || !fs.existsSync(path.join(dir, ".git"))) {
    return null;
  }
  return withWikiLock(cfg, () => {
    const refspec = `+refs/heads/${wiki.branch}:refs/remotes/origin/${wiki.branch}`;
    git(cfg, ["-C", dir, "fetch", "origin", refspec]);
    const dirty = uncommitted(dir, "the wiki checkout");
    if (dirty !== null) {
      return dirty;
    }
    const ahead = wikiAhead(cfg, n);
    if (ahead > 0) {
      return `the wiki checkout has ${ahead} commit(s) not on the wiki`;
    }
    return null;
  });
}

export type { WikiDiff };
export {
  ensureWiki,
  holdWikiPin,
  pushWikiBranch,
  unsavedWiki,
  wikiAhead,
  wikiBranchHasWork,
  wikiDiff,
};
