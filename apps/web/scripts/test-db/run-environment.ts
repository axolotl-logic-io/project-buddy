// A test run's own database and port (issue #475). Each `npm run
// test:server` or `npm run test:e2e` run creates a database of its own on the
// local test server, serves the site on a port of its own, and drops the
// database when it ends, so two runs at once, in one checkout or two, never
// reset each other's database. A database name or port that .env.test or the
// environment sets explicitly is used as given, and such a database is kept.
// A later run drops the databases of runs that were killed before they could
// drop their own. Node runs this file directly, so its imports are relative.
import type { TestDatabase } from "./test-database.ts";

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

export type { RunCommand, RunEnvironment, RunSettings, RunSources };

// A port on this machine that nothing listens on when it is asked for, and
// that is not a privileged one.
export function findFreePort(): Promise<number> {
  return Promise.reject(new Error("findFreePort is not implemented (#475)"));
}

// The database and port a run uses: the ones settings name, and for each
// that it leaves out, one of the run's own. A generated name is new to every
// call, records sources.pid, and passes checkTestDatabase. Throws, as
// checkTestDatabase does, unless the database is on this machine.
export function resolveRunEnvironment(
  _settings: RunSettings,
  _sources: Partial<RunSources> = {},
): Promise<RunEnvironment> {
  return Promise.reject(
    new Error("resolveRunEnvironment is not implemented (#475)"),
  );
}

// Whether name is the database of a run that ended without dropping it: a
// name a run generated, or a scratch database beside one, whose process is
// no longer alive. No other name is ever stale.
export function isStaleTestDatabase(
  _name: string,
  _isAlive?: (pid: number) => boolean,
): boolean {
  throw new Error("isStaleTestDatabase is not implemented (#475)");
}

// Runs command in a run's own environment and answers its exit code. First
// it resolves the environment, refuses it as checkTestEnvironment would,
// drops the stale databases of runs that ended, and resets the run's
// database and migrates it. A generated database is dropped when the command
// ends, whether it passes, fails or throws; one settings named is kept.
export function runWithTestDatabase(
  _settings: RunSettings,
  _command: RunCommand,
  _sources: Partial<RunSources> = {},
): Promise<number> {
  return Promise.reject(
    new Error("runWithTestDatabase is not implemented (#475)"),
  );
}
