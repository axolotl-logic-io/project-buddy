// This worktree's development database: makes it if it's missing, and gives
// it this checkout's migrations. Drizzle's migrator applies only migrations
// newer than the last one applied, so it can't repair a history that differs
// from the checkout, such as one with a migration renumbered or edited after
// a rebase. Then the database is dropped and migrated afresh. Its data is
// lost; that is the price of a database that matches the code.
//
// mise setup runs this through `npm run dev:database`, with the development
// settings in the environment. mise run doctor calls migrationState. Both run
// after npm ci, so this may import dependencies.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { developmentDatabaseUrl } from "./environment.ts";

const WEB_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const MIGRATIONS_FOLDER = join(WEB_ROOT, "drizzle");
// The database a reset connects to while it drops and makes this one.
const MAINTENANCE_DATABASE = "postgres";
const DEVELOPMENT_DATABASE_NAME = /^pb_dev_[\da-f]+$/u;
const CONNECTION_TIMEOUT_MS = 3000;
const UNDEFINED_TABLE = "42P01";

type MigrationState = "current" | "pending" | "diverged";

// An error whose message names no database or credentials, so it is shown.
class SetupError extends Error {}

// The name of the database that url names, only if it is this worktree's
// own development database on the local Compose server: the one URL setup
// derives for this checkout. Nothing else may be made or dropped.
function localDevelopmentDatabase(url: string | undefined): {
  url: string;
  name: string;
} {
  const refusal = new SetupError(
    "DATABASE_URL is not this worktree's local development database; setup makes, migrates and resets no other database.",
  );
  if (url === undefined || url !== developmentDatabaseUrl(WEB_ROOT)) {
    throw refusal;
  }
  const name = new URL(url).pathname.slice(1);
  if (!DEVELOPMENT_DATABASE_NAME.test(name)) {
    throw refusal;
  }
  return { url, name };
}

async function withClient<T>(
  url: string,
  work: (client: pg.Client) => Promise<T>,
): Promise<T> {
  const client = new pg.Client({
    connectionString: url,
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
  });
  await client.connect();
  try {
    return await work(client);
  } finally {
    await client.end();
  }
}

function maintenanceUrl(url: string): string {
  const maintenance = new URL(url);
  maintenance.pathname = `/${MAINTENANCE_DATABASE}`;
  return maintenance.href;
}

// Whether the database has exactly the checkout's migrations, lacks some,
// or has some the checkout doesn't. It changes nothing.
async function migrationState(url: string): Promise<MigrationState> {
  return await withClient(url, async (client) => {
    await client.query("SET statement_timeout = 3000");
    await client.query("BEGIN READ ONLY");
    let applied: Set<string>;
    try {
      const { rows } = await client.query<{ hash: string }>(
        "SELECT hash FROM drizzle.__drizzle_migrations",
      );
      applied = new Set(rows.map((row) => row.hash));
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === UNDEFINED_TABLE
      ) {
        return "pending";
      }
      throw error;
    }
    const known = new Set(
      readdirSync(MIGRATIONS_FOLDER)
        .filter((file) => file.endsWith(".sql"))
        .map((file) =>
          createHash("sha256")
            .update(readFileSync(join(MIGRATIONS_FOLDER, file)))
            .digest("hex"),
        ),
    );
    if ([...applied].some((hash) => !known.has(hash))) {
      return "diverged";
    }
    if ([...known].some((hash) => !applied.has(hash))) {
      return "pending";
    }
    return "current";
  });
}

async function databaseExists(url: string, name: string): Promise<boolean> {
  return await withClient(maintenanceUrl(url), async (client) => {
    const { rowCount } = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [name],
    );
    return rowCount === 1;
  });
}

// Drops the database if it exists, closing its connections, and makes it
// empty. The name is checked, so it is safe to put in the statement.
async function recreateDatabase(url: string): Promise<void> {
  const { name } = localDevelopmentDatabase(url);
  await withClient(maintenanceUrl(url), async (client) => {
    await client.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await client.query(`CREATE DATABASE ${name}`);
  });
}

async function migrateDatabase(url: string): Promise<void> {
  localDevelopmentDatabase(url);
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    await migrate(drizzle({ client: pool }), {
      migrationsFolder: MIGRATIONS_FOLDER,
    });
  } catch (cause) {
    throw new SetupError(
      "Development migrations failed. Run mise run doctor to check database access and migration history.",
      { cause },
    );
  } finally {
    await pool.end();
  }
}

// Brings the database to the checkout's migrations, and says whether that
// took a reset.
async function prepareDatabase(url: string | undefined): Promise<boolean> {
  const { url: local, name } = localDevelopmentDatabase(url);
  let reset = false;
  if (!(await databaseExists(local, name))) {
    await recreateDatabase(local);
  } else if ((await migrationState(local)) === "diverged") {
    await recreateDatabase(local);
    reset = true;
  }
  await migrateDatabase(local);
  // Migrations older than the last one applied are skipped, not applied.
  if (!reset && (await migrationState(local)) !== "current") {
    await recreateDatabase(local);
    reset = true;
    await migrateDatabase(local);
  }
  if ((await migrationState(local)) !== "current") {
    throw new SetupError(
      "The development database still differs from this checkout's migrations after a reset.",
    );
  }
  return reset;
}

if (import.meta.main) {
  try {
    const { DATABASE_URL } = process.env;
    if (await prepareDatabase(DATABASE_URL)) {
      console.log(
        "Reset this worktree's development database: its migrations differed from this checkout's, so its data is gone.",
      );
    }
  } catch (error) {
    // A database error may name the database URL; report only our own.
    let message =
      "Could not prepare the development database. Run mise run doctor to check it.";
    if (error instanceof SetupError) {
      ({ message } = error);
    }
    console.error(message);
    process.exitCode = 1;
  }
}

export { localDevelopmentDatabase, migrationState };
