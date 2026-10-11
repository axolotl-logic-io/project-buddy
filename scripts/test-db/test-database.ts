// The end-to-end test environment, from .env.test: a Postgres database on
// this machine, served by the Docker services in compose.test-db.yml through
// Neon's local proxy, and the tutor's mock model. This module refuses any
// other database or model, so a reset or a test run can never reach
// production or call Claude. Node runs this file directly, so its imports
// are relative.
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { openPool } from "../../src/db/client.ts";
import { readTestDatabaseUrl, readTutorModel } from "../../src/env.ts";

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
// a connection string naming a plain database, not one the server keeps for
// itself, on this machine. Only local hosts pass, so Neon's production
// database, or any other remote one, never does, whatever .env.local holds.
export function checkTestDatabase(databaseUrl: string): TestDatabase {
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
  return { url: databaseUrl, name: databaseName(url) };
}

// The test database that DATABASE_URL names, checked as checkTestDatabase
// does. Throws, saying why, unless DATABASE_URL is set and the tutor also
// runs its mock model, so the tests never call Claude.
export function checkTestEnvironment(): TestDatabase {
  const database = checkTestDatabase(readTestDatabaseUrl());
  if (readTutorModel() !== "mock") {
    throw new Error(
      'TUTOR_MODEL is not "mock", so the tests would call Claude. The test commands load it from .env.test: copy it from .env.test.example.',
    );
  }
  return database;
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
