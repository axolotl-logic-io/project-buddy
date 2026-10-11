// The end-to-end test database: a Postgres database on this machine, served
// by the Docker services in compose.test-db.yml through Neon's local proxy.
// DATABASE_URL names it, from .env.test. This module refuses any other
// database, so a reset or a test run can never reach production. Node runs
// this file directly, so its imports are relative.
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { isOnThisMachine, openPool } from "../../src/db/client.ts";
import { readDatabaseUrlForTooling } from "../../src/env.ts";

// A checked test database.
interface TestDatabase {
  // The connection string the app and the tests use.
  readonly url: string;
  // The database's name on the local server.
  readonly name: string;
}

const NEON_HOST_SUFFIX = ".neon.tech";
// Names that need no quoting in SQL, so a reset can drop the database safely.
const PLAIN_DATABASE_NAME = /^[a-z_][\d_a-z]*$/u;
// The server's own databases. The proxy keeps its endpoint table in "main".
const RESERVED_DATABASE_NAMES: ReadonlySet<string> = new Set([
  "main",
  "postgres",
  "template0",
  "template1",
]);
// The database a reset connects to while it drops and creates the test one.
const MAINTENANCE_DATABASE = "postgres";
const MIGRATIONS_FOLDER = "./drizzle";

function parseUrl(value: string): URL {
  try {
    return new URL(value);
  } catch (error) {
    throw new Error(
      "DATABASE_URL is not a connection string. See .env.test.example.",
      { cause: error },
    );
  }
}

function databaseName(url: URL): string {
  const name = decodeURIComponent(url.pathname.slice(1));
  if (RESERVED_DATABASE_NAMES.has(name)) {
    throw new Error(
      `DATABASE_URL names "${name}", which is reserved for the Postgres server and the proxy. Name a database of its own in .env.test.`,
    );
  }
  if (!PLAIN_DATABASE_NAME.test(name)) {
    throw new Error(
      `DATABASE_URL names "${name}". Use lowercase letters, digits and underscores only.`,
    );
  }
  return name;
}

export type { TestDatabase };

// The test database that databaseUrl names. Throws, saying why, unless it is
// set and names a plain database, not one the server keeps for itself, on
// this machine. Only local hosts pass, so Neon's production database, or any
// other remote one, never does, whatever .env.local holds.
export function checkTestDatabase(
  databaseUrl: string | undefined,
): TestDatabase {
  const value = databaseUrl?.trim() ?? "";
  if (value === "") {
    throw new Error(
      "DATABASE_URL is not set. The test commands load it from .env.test: copy .env.test.example to .env.test.",
    );
  }
  const url = parseUrl(value);
  if (url.hostname.endsWith(NEON_HOST_SUFFIX)) {
    throw new Error(
      `DATABASE_URL points at ${url.hostname}, a Neon database. The tests use the local test database in .env.test.`,
    );
  }
  if (!isOnThisMachine(url.hostname)) {
    throw new Error(
      `DATABASE_URL points at ${url.hostname}, which is not on this machine. The tests use the local test database in .env.test.`,
    );
  }
  return { url: value, name: databaseName(url) };
}

// The test database that DATABASE_URL names, checked as checkTestDatabase
// does.
export function readTestDatabase(): TestDatabase {
  return checkTestDatabase(readDatabaseUrlForTooling());
}

// Drops and recreates the test database, then applies every migration in
// drizzle/, so it holds the current schema and no rows.
export async function resetTestDatabase(database: TestDatabase): Promise<void> {
  const maintenanceUrl = new URL(database.url);
  maintenanceUrl.pathname = `/${MAINTENANCE_DATABASE}`;
  const maintenance = openPool(maintenanceUrl.href);
  try {
    await maintenance.query(
      `drop database if exists ${database.name} with (force)`,
    );
    await maintenance.query(`create database ${database.name}`);
  } finally {
    await maintenance.end();
  }
  const pool = openPool(database.url);
  try {
    await migrate(drizzle({ client: pool }), {
      migrationsFolder: MIGRATIONS_FOLDER,
    });
  } finally {
    await pool.end();
  }
}
