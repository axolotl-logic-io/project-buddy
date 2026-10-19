// A test run's own database and port (issue #475). Each `npm run
// test:server` or `npm run test:e2e` run creates a database of its own on the
// local test server, serves the site on a port of its own, and drops the
// database when it ends, so two runs at once, in one checkout or two, never
// reset each other's database. A database name or port that .env.test or the
// environment sets explicitly is used as given, and such a database is kept.
// A later run recovers only journals proving the entire invocation abandoned. Node runs this file directly, so its imports are relative.
import { randomBytes } from "node:crypto";
import { createServer } from "node:net";
import { pid as processId } from "node:process";
import {
  createRunOwnership,
  dropRunDatabases,
  type RunOwnership,
  recoverAbandonedDatabases,
} from "./run-ownership.ts";
import {
  checkTestDatabase,
  checkTestDatabaseServer,
  checkTestEnvironment,
  createTestDatabase,
  migrateTestDatabase,
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
  // The durable lifecycle journal, supplied by the CLI when it has children.
  readonly ownership?: RunOwnership;
  readonly stop?: () => Promise<void>;
  readonly signal?: AbortSignal;
  // CLI port ownership may reserve even an explicitly selected port.
  readonly reservePort?: (port: number | undefined) => Promise<number>;
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
const RANDOM_BYTES = 4;
// The path of a connection string that names no database.
const NO_DATABASE_PATHS: ReadonlySet<string> = new Set(["", "/"]);
const LARGEST_PROCESS_ID = 2_147_483_647;
const FIRST_UNPRIVILEGED_PORT = 1024;

// The database databaseUrl names, or with none, a new one of the run's own on
// the same server, with the same user, password and options.
function runDatabase(
  databaseUrl: string,
  pid: number,
): { readonly database: TestDatabase; readonly generated: boolean } {
  if (!Number.isInteger(pid) || pid < 1 || pid > LARGEST_PROCESS_ID) {
    throw new Error("A test run needs a positive operating-system process id.");
  }
  const url = checkTestDatabaseServer(databaseUrl);
  if (!NO_DATABASE_PATHS.has(url.pathname)) {
    return { database: checkPinnedTestDatabase(databaseUrl), generated: false };
  }
  const random = randomBytes(RANDOM_BYTES).toString("hex");
  url.pathname = `/${GENERATED_PREFIX}_${pid}_${random}`;
  return { database: checkTestDatabase(url.href), generated: true };
}

export type { RunCommand, RunEnvironment, RunSettings, RunSources };

// Explicit names cannot borrow the namespace that stale cleanup owns.
export function checkPinnedTestDatabase(databaseUrl: string): TestDatabase {
  const database = checkTestDatabase(databaseUrl);
  if (database.name.startsWith(`${GENERATED_PREFIX}_`)) {
    throw new Error(
      "DATABASE_URL pins a generated-run name. Pin a plain name outside the generated namespace so stale cleanup cannot drop it.",
    );
  }
  return database;
}

// A port on this machine that nothing listens on when it is asked for, and
// that is not a privileged one: one the operating system hands out to a
// server on every interface, as `next start` binds them.
export function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, () => {
      const address = server.address();
      server.close((error) => {
        if (error !== undefined) {
          reject(error);
          return;
        }
        if (address === null || typeof address === "string") {
          reject(new Error("The free port's server has no port."));
          return;
        }
        if (address.port < FIRST_UNPRIVILEGED_PORT) {
          reject(new Error("The free port is privileged; refusing to use it."));
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
  let port: number;
  if (sources.reservePort === undefined) {
    port = settings.port ?? (await (sources.freePort ?? findFreePort)());
  } else {
    port = await sources.reservePort(settings.port);
  }
  if (settings.port === undefined && port < FIRST_UNPRIVILEGED_PORT) {
    throw new Error(
      "The run’s generated port is privileged; refusing to use it.",
    );
  }
  return { database, port, generated };
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
  sources.signal?.throwIfAborted();
  const environment = await resolveRunEnvironment(settings, sources);
  const { database, generated } = environment;
  checkTestEnvironment(database.url);
  const ownership = sources.ownership ?? (await createRunOwnership());
  await recoverAbandonedDatabases(database);
  if (generated) {
    await ownership.reserve(database);
  }
  let created = false;
  let result: { code: number } | { error: unknown };
  try {
    sources.signal?.throwIfAborted();
    if (generated) {
      await createTestDatabase(database);
      created = true;
      await ownership.created();
      sources.signal?.throwIfAborted();
      await migrateTestDatabase(database);
    } else {
      await resetTestDatabase(database);
    }
    sources.signal?.throwIfAborted();
    result = { code: await command(environment) };
  } catch (error) {
    result = { error };
  }
  // Never drop resources that a known supported process could still be using.
  // Leave the journal for conservative later recovery if shutdown fails.
  await sources.stop?.();
  try {
    if (created) {
      await dropRunDatabases(database);
    }
  } catch (cleanupError) {
    if ("error" in result) {
      throw Object.assign(
        new Error("The test run and its database cleanup both failed.", {
          cause: cleanupError,
        }),
        { errors: [result.error, cleanupError] },
      );
    }
    throw cleanupError;
  }
  await ownership.remove();
  if ("error" in result) {
    throw result.error;
  }
  return result.code;
}
