// The end-to-end test environment: a Postgres database on this machine,
// served by the Docker services in compose.test-db.yml through Neon's local
// proxy, the tutor's mock model, and the file outbox for email. .env.test
// gives the server, and a test run's database is its own unless .env.test
// names one (run-environment.ts). This module refuses any other database,
// model or email transport, so a reset or a test run can never reach
// production, call Claude or send real email. Node runs this file directly,
// so its imports are relative.
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { z } from "zod";
import { openPool } from "../../src/db/client.ts";
import {
  readEmailOutboxDir,
  readEmailTransport,
  readTestDatabaseUrl,
  readTutorModel,
} from "../../src/env.ts";
import { databaseName } from "./database-name.ts";

// A checked test database.
interface TestDatabase {
  // The connection string the app and the tests use.
  readonly url: string;
  // The database's name on the local server.
  readonly name: string;
}

const NEON_HOST_SUFFIX = ".neon.tech";
// The only hosts a test database may be on: this machine. This list is the
// guard's own, so routing more hosts to the local proxy in src/db/client.ts
// never widens what a reset may drop.
const TEST_DATABASE_HOSTS: ReadonlySet<string> = new Set([
  "localhost",
  "127.0.0.1",
]);
// Names that need no quoting in SQL, so a reset can drop the database safely.
const POSTGRES_PROTOCOLS = new Set(["postgres:", "postgresql:"]);
// No driver routing, filesystem TLS options or arbitrary server settings.
const CONNECTION_OPTIONS = z.array(
  z.union([
    z.tuple([
      z.literal("sslmode"),
      z.enum([
        "disable",
        "prefer",
        "require",
        "verify-ca",
        "verify-full",
        "no-verify",
      ]),
    ]),
    z.tuple([z.literal("application_name"), z.string()]),
  ]),
);
// The server's own databases. The proxy keeps its endpoint table in "main".
// The database a reset connects to while it drops and creates the test one.
const MAINTENANCE_DATABASE = "postgres";
const MIGRATIONS_FOLDER = "./drizzle";
// Bound an unavailable proxy or stuck statement, including cancellation cleanup.
const DATABASE_OPERATION_TIMEOUT_MS = 30_000;
const DATABASE_NAME_ROWS = z.array(z.object({ datname: z.string() }));

function parseUrl(value: string): URL {
  const parsed = z.url().safeParse(value);
  if (!parsed.success) {
    throw new Error(
      "DATABASE_URL is not a connection string. See .env.test.example.",
    );
  }
  return new URL(parsed.data);
}

// URL and driver parsing must agree before any pool is opened. In particular,
// node-postgres lets query parameters override the URL host and read TLS files.
function checkConnectionOptions(url: URL): void {
  if (!POSTGRES_PROTOCOLS.has(url.protocol) || url.hash !== "") {
    throw new Error(
      "DATABASE_URL must be a Postgres connection string without a fragment.",
    );
  }
  if (url.username === "" || url.password === "") {
    throw new Error(
      "DATABASE_URL must give the test server’s user and password explicitly.",
    );
  }
  const keys = new Set<string>();
  for (const key of url.searchParams.keys()) {
    if (keys.has(key)) {
      throw new Error("DATABASE_URL repeats a connection option.");
    }
    keys.add(key);
  }
  if (!CONNECTION_OPTIONS.safeParse(Array.from(url.searchParams)).success) {
    throw new Error(
      "DATABASE_URL permits only sslmode and application_name connection options; driver overrides are unsafe in tests.",
    );
  }
}

// Throws, saying why, unless the site writes its email to the outbox, so
// the tests read it there and never send real email through Resend.
function checkEmailOutbox(): void {
  if (readEmailTransport() !== "outbox") {
    throw new Error(
      'EMAIL_TRANSPORT is not "outbox", so the tests would send email through Resend. The test commands load it from .env.test: copy it from .env.test.example.',
    );
  }
  try {
    readEmailOutboxDir();
  } catch (error) {
    throw new Error(
      "EMAIL_OUTBOX_DIR is not set, so the tests can't read the site's email. The test commands load it from .env.test: copy it from .env.test.example.",
      { cause: error },
    );
  }
}

function testPool(databaseUrl: string): ReturnType<typeof openPool> {
  const pool = openPool(databaseUrl);
  pool.options.connectionTimeoutMillis = DATABASE_OPERATION_TIMEOUT_MS;
  pool.options.query_timeout = DATABASE_OPERATION_TIMEOUT_MS;
  pool.options.statement_timeout = DATABASE_OPERATION_TIMEOUT_MS;
  return pool;
}

// Runs work on the local server's maintenance database, which a reset
// connects to while it drops or creates a test database.
async function onMaintenanceDatabase<T>(
  database: TestDatabase,
  work: (maintenance: ReturnType<typeof openPool>) => Promise<T>,
): Promise<T> {
  const maintenanceUrl = new URL(checkTestDatabase(database.url).url);
  maintenanceUrl.pathname = `/${MAINTENANCE_DATABASE}`;
  const maintenance = testPool(maintenanceUrl.href);
  try {
    return await work(maintenance);
  } finally {
    await maintenance.end();
  }
}

export type { TestDatabase };

// A safe local server connection template; its database path may be empty
// until the run assigns one. No driver overrides or implicit credentials pass.
export function checkTestDatabaseServer(databaseUrl: string): URL {
  const url = parseUrl(databaseUrl);
  if (url.hostname.endsWith(NEON_HOST_SUFFIX)) {
    throw new Error(
      `DATABASE_URL points at ${url.hostname}, a Neon database. The tests use the local test database in .env.test.`,
    );
  }
  if (!TEST_DATABASE_HOSTS.has(url.hostname)) {
    throw new Error(
      `DATABASE_URL points at ${url.hostname}, which is not on this machine. The tests use the local test database in .env.test.`,
    );
  }
  checkConnectionOptions(url);
  return url;
}

// A plain, non-reserved database on the checked local test server.
export function checkTestDatabase(databaseUrl: string): TestDatabase {
  const url = checkTestDatabaseServer(databaseUrl);
  const name = databaseName(url);
  // Keep the driver’s database path identical to the validated SQL identifier.
  url.pathname = `/${name}`;
  return { url: url.href, name };
}

// The test database that databaseUrl names, DATABASE_URL by default,
// checked as checkTestDatabase does. Throws, saying why, unless it is set,
// the tutor also runs its mock model, so the tests never call Claude, and
// email goes to the outbox.
export function checkTestEnvironment(
  databaseUrl: string = readTestDatabaseUrl(),
): TestDatabase {
  const database = checkTestDatabase(databaseUrl);
  if (readTutorModel() !== "mock") {
    throw new Error(
      'TUTOR_MODEL is not "mock", so the tests would call Claude. The test commands load it from .env.test: copy it from .env.test.example.',
    );
  }
  checkEmailOutbox();
  return database;
}

// The names of every database on the local server the test database is on,
// the server's own included.
export function listServerDatabases(
  database: TestDatabase,
): Promise<readonly string[]> {
  return onMaintenanceDatabase(database, async (maintenance) => {
    const { rows } = await maintenance.query("select datname from pg_database");
    return DATABASE_NAME_ROWS.parse(rows).map(({ datname }) => datname);
  });
}

// Drops the test database if it exists, closing any connection to it.
export async function dropTestDatabase(database: TestDatabase): Promise<void> {
  const { name } = checkTestDatabase(database.url);
  await onMaintenanceDatabase(database, async (maintenance) => {
    await maintenance.query(`drop database if exists ${name} with (force)`);
  });
}

// Creates a new database without resetting an existing one. A duplicate name
// fails before ownership is acquired, so a generated collision is never dropped.
export async function createTestDatabase(
  database: TestDatabase,
): Promise<void> {
  const { name } = checkTestDatabase(database.url);
  await onMaintenanceDatabase(database, async (maintenance) => {
    await maintenance.query(`create database ${name}`);
  });
}

// Drops and recreates the test database, then applies every migration in
// migrationsFolder, drizzle/ by default, so it holds that schema and no rows.
export async function resetTestDatabase(
  database: TestDatabase,
  migrationsFolder: string = MIGRATIONS_FOLDER,
): Promise<void> {
  const { name } = checkTestDatabase(database.url);
  await onMaintenanceDatabase(database, async (maintenance) => {
    await maintenance.query(`drop database if exists ${name} with (force)`);
    await maintenance.query(`create database ${name}`);
  });
  await migrateTestDatabase(database, migrationsFolder);
}

// Applies the migrations in migrationsFolder, drizzle/ by default, that the
// test database doesn't have yet.
export async function migrateTestDatabase(
  database: TestDatabase,
  migrationsFolder: string = MIGRATIONS_FOLDER,
): Promise<void> {
  const pool = testPool(checkTestDatabase(database.url).url);
  try {
    await migrate(drizzle({ client: pool }), { migrationsFolder });
  } finally {
    await pool.end();
  }
}

// Recovery never forcibly disconnects another process. Catalog checks guard the
// whole run (including scratch databases); DROP without FORCE also closes the
// check/drop race by refusing databases that acquired a connection meanwhile.
export async function dropUnusedRunDatabases(
  database: TestDatabase,
): Promise<void> {
  const { name } = checkTestDatabase(database.url);
  await onMaintenanceDatabase(database, async (maintenance) => {
    const names = (await listServerDatabases(database)).filter(
      (candidate) => candidate === name || candidate.startsWith(`${name}_`),
    );
    const { rows } = await maintenance.query(
      "select datname from pg_stat_activity where datname = any($1::text[])",
      [names],
    );
    if (rows.length > 0) {
      return;
    }
    await Promise.all(
      names.map(async (candidate) => {
        checkTestDatabase(new URL(`/${candidate}`, database.url).href);
        try {
          await maintenance.query(`drop database if exists ${candidate}`);
        } catch (error) {
          if (
            !(
              error instanceof Error &&
              "code" in error &&
              error.code === "55006"
            )
          ) {
            throw error;
          }
        }
      }),
    );
  });
}
