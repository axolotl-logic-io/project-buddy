// A test run's own database and port (issue #475). Each `npm run
// test:server` or `npm run test:e2e` run creates a database of its own on the
// local test server, serves the site on a port of its own, and drops the
// database when it ends, so two runs at once, in one checkout or two, never
// reset each other's database. A database name or port that .env.test or the
// environment sets explicitly is used as given, and such a database is kept.
// A later run drops the databases of runs that were killed before they could
// drop their own. Node runs this file directly, so its imports are relative.
import { randomBytes } from "node:crypto";
import { createServer } from "node:net";
import { kill, pid as processId } from "node:process";
import {
  checkTestDatabase,
  checkTestEnvironment,
  dropTestDatabase,
  listServerDatabases,
  resetTestDatabase,
  type TestDatabase,
} from "./test-database.ts";

// What a run's database and port come from: DATABASE_URL and E2E_PORT, as
// .env.test or the environment gives them.
interface RunSettings {
  // The local test server's connection string, with its user and password.
  // A database name in its path is used as given; with none, the run makes
  // one of its own.
  readonly databaseUrl: string;
  // The port to serve the site on, or undefined to take a free one.
  readonly port?: number | undefined;
}

// What the run reads from the machine, each replaceable in tests.
interface RunSources {
  // The id of the process the run belongs to, which the generated database
  // name records: process.pid by default.
  readonly pid: number;
  // A port nothing listens on: findFreePort by default.
  readonly freePort: () => Promise<number>;
  // Whether the process with this id is still running, so its database is
  // still in use: asks the operating system by default.
  readonly isAlive: (pid: number) => boolean;
}

// The database and port a run uses.
interface RunEnvironment {
  // The run's database, checked as checkTestDatabase checks it.
  readonly database: TestDatabase;
  // The port the run serves the site on.
  readonly port: number;
  // Whether the run made the database's name up: such a database is the
  // run's own, created at its start and dropped at its end.
  readonly generated: boolean;
}

// A command run inside a run's environment, answering its exit code.
type RunCommand = (environment: RunEnvironment) => Promise<number>;

// A generated database name, and the scratch databases' names beside it
// (test/test-database/scratch-database-test-kit.ts): the prefix, the id of
// the run's process, and a random part, so a run's name is new even when a
// process id comes round again.
const GENERATED_PREFIX = "project_buddy_e2e";
const GENERATED_DATABASE_NAME =
  /^project_buddy_e2e_(?<pid>\d{1,10})_[\da-f]{8}(?:_[\d_a-z]+)?$/u;
const RANDOM_BYTES = 4;
// The path of a connection string that names no database.
const NO_DATABASE_PATHS: ReadonlySet<string> = new Set(["", "/"]);
// What kill(pid, 0) throws for a process this one may not signal, which is
// still running.
const NOT_PERMITTED = "EPERM";

// Whether the process with this id is running, as the operating system says.
function isProcessAlive(id: number): boolean {
  try {
    kill(id, 0);
    return true;
  } catch (error) {
    return (
      error instanceof Error && "code" in error && error.code === NOT_PERMITTED
    );
  }
}

// The database databaseUrl names, or with none, a new one of the run's own on
// the same server, with the same user, password and options.
function runDatabase(
  databaseUrl: string,
  pid: number,
): { readonly database: TestDatabase; readonly generated: boolean } {
  const url = new URL(databaseUrl);
  if (!NO_DATABASE_PATHS.has(url.pathname)) {
    return { database: checkTestDatabase(databaseUrl), generated: false };
  }
  const random = randomBytes(RANDOM_BYTES).toString("hex");
  url.pathname = `/${GENERATED_PREFIX}_${pid}_${random}`;
  return { database: checkTestDatabase(url.href), generated: true };
}

// The database called name, on the same server as database.
function databaseBeside(database: TestDatabase, name: string): TestDatabase {
  const url = new URL(database.url);
  url.pathname = `/${name}`;
  return checkTestDatabase(url.href);
}

// Drops the stale databases on the run's server, other than its own.
async function dropStaleDatabases(
  own: TestDatabase,
  isAlive: (pid: number) => boolean,
): Promise<void> {
  const stale = (await listServerDatabases(own)).filter(
    (name) => name !== own.name && isStaleTestDatabase(name, isAlive),
  );
  await Promise.all(
    stale.map((name) => dropTestDatabase(databaseBeside(own, name))),
  );
}

export type { RunCommand, RunEnvironment, RunSettings, RunSources };

// A port on this machine that nothing listens on when it is asked for, and
// that is not a privileged one: one the operating system hands out to a
// server on every interface, as `next start` binds them.
export function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, () => {
      const address = server.address();
      server.close(() => {
        if (address === null || typeof address === "string") {
          reject(new Error("The free port's server has no port."));
          return;
        }
        resolve(address.port);
      });
    });
  });
}

// The database and port a run uses: the ones settings name, and for each
// that it leaves out, one of the run's own. A generated name is new to every
// call, records sources.pid, and passes checkTestDatabase. Throws, as
// checkTestDatabase does, unless the database is on this machine.
export async function resolveRunEnvironment(
  settings: RunSettings,
  sources: Partial<RunSources> = {},
): Promise<RunEnvironment> {
  const { database, generated } = runDatabase(
    settings.databaseUrl,
    sources.pid ?? processId,
  );
  const port = settings.port ?? (await (sources.freePort ?? findFreePort)());
  return { database, port, generated };
}

// Whether name is the database of a run that ended without dropping it: a
// name a run generated, or a scratch database beside one, whose process is
// no longer alive. No other name is ever stale.
export function isStaleTestDatabase(
  name: string,
  isAlive: (pid: number) => boolean = isProcessAlive,
): boolean {
  const groups = GENERATED_DATABASE_NAME.exec(name)?.groups;
  if (groups === undefined) {
    return false;
  }
  const { pid } = groups;
  if (pid === undefined) {
    return false;
  }
  return !isAlive(Number(pid));
}

// Runs command in a run's own environment and answers its exit code. First
// it resolves the environment, refuses it as checkTestEnvironment would,
// drops the stale databases of runs that ended, and resets the run's
// database and migrates it. A generated database is dropped when the command
// ends, whether it passes, fails or throws; one settings named is kept.
export async function runWithTestDatabase(
  settings: RunSettings,
  command: RunCommand,
  sources: Partial<RunSources> = {},
): Promise<number> {
  const environment = await resolveRunEnvironment(settings, sources);
  const { database, generated } = environment;
  checkTestEnvironment(database.url);
  await dropStaleDatabases(database, sources.isAlive ?? isProcessAlive);
  try {
    await resetTestDatabase(database);
    return await command(environment);
  } finally {
    if (generated) {
      await dropTestDatabase(database);
    }
  }
}
