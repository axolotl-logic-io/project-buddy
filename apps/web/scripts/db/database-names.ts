// This checkout's local databases, and the site port its system tests use.
// Each name is made from the branch checked out and the repository's git
// directory, so every branch of every clone on a machine has databases of
// its own and nothing has to hand them out: no settings file, lane or
// pipeline. A detached HEAD gets databases of its worktree's own.
//
// Node built-ins only: setup reads these names before npm ci. No
// import.meta either: Playwright loads its config, which reads the system
// test port, as CommonJS.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

// What a database is for. The development database keeps its data on
// compose.dev-db.yml's server; the server and system test databases are
// emptied before each run, on compose.test-db.yml's in-memory server.
type DatabaseRole = "dev" | "server" | "system";

// Who a database belongs to: a branch of a repository, or, for a detached
// HEAD, a worktree of it.
interface DatabaseOwner {
  // The repository's git directory, shared by all of its worktrees.
  readonly repository: string;
  // The branch, or null for a detached HEAD.
  readonly branch: string | null;
  // The worktree the database was made from.
  readonly worktree: string;
}

interface LocalDatabase {
  readonly name: string;
  readonly url: string;
}

// The local-only user and password both Compose servers use.
const SERVER_USER = "postgres";
const DEVELOPMENT_SERVER = "127.0.0.1:5434";
const TEST_SERVER = "127.0.0.1:5433";
const NOT_SLUG_CHARACTERS = /[^\da-z]+/gu;
const EDGE_UNDERSCORES = /^_+|_+$/gu;
// pb_ + slug + _ + key + _ + role leaves 20 of Postgres's 63 characters for
// a scratch database's suffix.
const SLUG_LENGTH = 24;
const MAX_NAME_LENGTH = 63;
const KEY_LENGTH = 8;
// System test site ports: 30000-39999, clear of the development site's 3000.
const FIRST_SITE_PORT = 30_000;
const SITE_PORTS = 10_000;
// The only names this module makes, so the only ones a reset may drop: a
// role's database, or a scratch database beside it.
const DATABASE_NAME =
  /^pb_[\da-z_]+_[\da-f]{8}_(?:dev|server|system)(?:_[\da-z_]+)?$/u;

let checkout: DatabaseOwner | undefined;

// The checkout of the working folder, read from git once per process. Every
// task runs in its app's folder.
function checkoutOwner(): DatabaseOwner {
  if (checkout === undefined) {
    const [repository = "", head = "", worktree = ""] = execFileSync(
      "git",
      [
        "rev-parse",
        "--path-format=absolute",
        "--git-common-dir",
        "--abbrev-ref",
        "HEAD",
        "--show-toplevel",
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
    ).split("\n");
    let branch: string | null = head;
    if (head === "HEAD") {
      branch = null;
    }
    checkout = { repository, branch, worktree };
  }
  return checkout;
}

// A short hash of the owner: the same for the same branch of a repository.
function ownerKey(owner: DatabaseOwner): string {
  let place = owner.worktree;
  if (owner.branch !== null) {
    place = `refs/heads/${owner.branch}`;
  }
  return createHash("sha256")
    .update(`${owner.repository}\0${place}`)
    .digest("hex")
    .slice(0, KEY_LENGTH);
}

function slug(owner: DatabaseOwner): string {
  const words = (owner.branch ?? "detached")
    .toLowerCase()
    .replace(NOT_SLUG_CHARACTERS, "_")
    .slice(0, SLUG_LENGTH)
    .replace(EDGE_UNDERSCORES, "");
  return words || "branch";
}

// The database for role that belongs to owner, this checkout by default.
function localDatabase(
  role: DatabaseRole,
  owner: DatabaseOwner = checkoutOwner(),
): LocalDatabase {
  const name = `pb_${slug(owner)}_${ownerKey(owner)}_${role}`;
  let server = TEST_SERVER;
  if (role === "dev") {
    server = DEVELOPMENT_SERVER;
  }
  const url = new URL(`postgres://${server}/${name}`);
  url.username = SERVER_USER;
  url.password = SERVER_USER;
  return { name, url: url.href };
}

// The port the system tests serve the built site on.
function systemTestPort(): number {
  return (
    FIRST_SITE_PORT +
    (Number.parseInt(ownerKey(checkoutOwner()), 16) % SITE_PORTS)
  );
}

// A database of one test's own beside this checkout's server test database,
// for a test that migrates or rebuilds a whole database.
function scratchDatabase(suffix: string): LocalDatabase {
  const { name, url } = localDatabase("server");
  const scratch = new URL(url);
  scratch.pathname = `/${name}_${suffix}`;
  return { name: `${name}_${suffix}`, url: scratch.href };
}

// Whether name is one this module makes, and so safe to put in a statement.
function isLocalDatabaseName(name: string): boolean {
  return name.length <= MAX_NAME_LENGTH && DATABASE_NAME.test(name);
}

export type { DatabaseOwner, DatabaseRole, LocalDatabase };
export {
  checkoutOwner,
  isLocalDatabaseName,
  localDatabase,
  scratchDatabase,
  systemTestPort,
};
