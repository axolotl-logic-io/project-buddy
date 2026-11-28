// `mise run db:prune`: drops the local databases whose owner is gone: a
// repository that no longer exists, a branch deleted from its repository, or
// the worktree of a detached HEAD. Databases of other clones on this
// machine count too, since each records its owner. A server that isn't
// running is skipped; the test server keeps nothing once it stops anyway.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import {
  type DatabaseOwner,
  type DatabaseRole,
  localDatabase,
} from "./database-names.ts";
import { dropDatabase, serverDatabases } from "./local-databases.ts";

// One role on each Compose server.
const SERVERS: readonly { role: DatabaseRole; label: string }[] = [
  { role: "dev", label: "development" },
  { role: "server", label: "test" },
];

// Whether the database's owner is gone. A database that recorded no owner
// is kept: this checkout can't tell whose it is.
function isGone(owner: DatabaseOwner | undefined): boolean {
  if (owner === undefined) {
    return false;
  }
  if (!existsSync(owner.repository)) {
    return true;
  }
  if (owner.branch === null) {
    return !existsSync(owner.worktree);
  }
  const branch = spawnSync(
    "git",
    [
      `--git-dir=${owner.repository}`,
      "show-ref",
      "--verify",
      "--quiet",
      `refs/heads/${owner.branch}`,
    ],
    { stdio: "ignore" },
  );
  return branch.status !== 0;
}

// What pruning the server that role's database is on did, in lines to print.
async function pruneServer(
  role: DatabaseRole,
  label: string,
): Promise<string[]> {
  let databases: Awaited<ReturnType<typeof serverDatabases>>;
  try {
    databases = await serverDatabases(localDatabase(role));
  } catch {
    return [`Skipped the ${label} server: it isn't running.`];
  }
  const gone = databases.filter(({ owner }) => isGone(owner));
  await Promise.all(gone.map(dropDatabase));
  return [
    ...gone.map(({ name }) => `Dropped ${name}.`),
    `The ${label} server keeps ${databases.length - gone.length} of its ${databases.length} branch databases.`,
  ];
}

if (import.meta.main) {
  const reports: string[][] = await Promise.all(
    SERVERS.map(({ role, label }) => pruneServer(role, label)),
  );
  console.log(reports.flat().join("\n"));
}

export { isGone };
