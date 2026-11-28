// The local databases' names: one set per branch of a repository, and the
// prune's rule for which owners are gone.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
  checkoutOwner,
  type DatabaseOwner,
  isLocalDatabaseName,
  localDatabase,
  scratchDatabase,
  systemTestPort,
} from "../../../../scripts/db/database-names.ts";
import { isGone } from "../../../../scripts/db/prune.ts";

const MAX_NAME_LENGTH = 63;
const FIRST_SITE_PORT = 30_000;
const LAST_SITE_PORT = 39_999;
const ROLES = ["dev", "server", "system"] as const;
// Far longer than a name may be.
const LONG_BRANCH_LENGTH = 200;
const LONG_BRANCH = `issues/${"x".repeat(LONG_BRANCH_LENGTH)}`;
const BRANCH_NAME = /^pb_issues_12_quest_trail_[\da-f]{8}_dev$/u;

const owner: DatabaseOwner = {
  repository: "/work/project-buddy/.git",
  branch: "issues/12-Quest Trail",
  worktree: "/work/trees/one",
};

describe("local database names", () => {
  test("name the branch, and are the same from every worktree of it", () => {
    const { name } = localDatabase("dev", owner);
    expect(name).toMatch(BRANCH_NAME);
    expect(localDatabase("dev", { ...owner, worktree: "/work/two" }).name).toBe(
      name,
    );
  });

  test("differ between branches, repositories and roles", () => {
    const names = new Set([
      ...ROLES.map((role) => localDatabase(role, owner).name),
      localDatabase("dev", { ...owner, branch: "integration" }).name,
      localDatabase("dev", { ...owner, repository: "/clone/.git" }).name,
    ]);
    expect(names.size).toBe(ROLES.length + 2);
  });

  test("give a detached HEAD databases of its worktree's own", () => {
    const detached = { ...owner, branch: null };
    const { name } = localDatabase("dev", detached);
    expect(name.startsWith("pb_detached_")).toBe(true);
    expect(
      localDatabase("dev", { ...detached, worktree: "/other" }).name,
    ).not.toBe(name);
  });

  test("put the development database on its own server and the test ones on the test server", () => {
    expect(new URL(localDatabase("dev", owner).url).port).toBe("5434");
    expect(new URL(localDatabase("server", owner).url).port).toBe("5433");
    expect(new URL(localDatabase("system", owner).url).port).toBe("5433");
  });

  test("fit Postgres's limit and the names a reset may drop, scratch ones too", () => {
    const longest = { ...owner, branch: LONG_BRANCH };
    for (const role of ROLES) {
      const { name } = localDatabase(role, longest);
      expect(name.length).toBeLessThanOrEqual(MAX_NAME_LENGTH);
      expect(isLocalDatabaseName(name)).toBe(true);
    }
    expect(isLocalDatabaseName(scratchDatabase("signup_rollback").name)).toBe(
      true,
    );
    expect(isLocalDatabaseName("postgres")).toBe(false);
    expect(isLocalDatabaseName("pb_x_0123abcd_dev; DROP")).toBe(false);
  });

  test("read this checkout's owner from git", () => {
    const checkout = checkoutOwner();
    expect(checkout.repository.endsWith(".git")).toBe(true);
    expect(localDatabase("dev").name).toBe(localDatabase("dev", checkout).name);
    const port = systemTestPort();
    expect(port).toBeGreaterThanOrEqual(FIRST_SITE_PORT);
    expect(port).toBeLessThanOrEqual(LAST_SITE_PORT);
  });
});

describe("pruning", () => {
  let repository: string;

  function git(...args: string[]): void {
    execFileSync("git", ["-C", repository, ...args], { stdio: "ignore" });
  }

  beforeAll(() => {
    repository = mkdtempSync(join(tmpdir(), "buddy-prune-"));
    git("init", "--quiet", "--initial-branch=kept");
    git(
      "-c",
      "user.name=Test",
      "-c",
      "user.email=test@example.test",
      "commit",
      "--quiet",
      "--allow-empty",
      "--message=start",
    );
  });

  afterAll(() => {
    rmSync(repository, { recursive: true, force: true });
  });

  test("drops the databases of a deleted branch, worktree or repository only", () => {
    const base = {
      repository: join(repository, ".git"),
      worktree: repository,
    };
    expect(isGone({ ...base, branch: "kept" })).toBe(false);
    expect(isGone({ ...base, branch: "deleted" })).toBe(true);
    expect(isGone({ ...base, branch: null })).toBe(false);
    expect(isGone({ ...base, branch: null, worktree: "/gone/tree" })).toBe(
      true,
    );
    expect(isGone({ ...base, repository: "/gone/.git", branch: "kept" })).toBe(
      true,
    );
    expect(isGone(undefined)).toBe(false);
  });
});
