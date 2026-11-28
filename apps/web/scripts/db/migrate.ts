// `mise run //apps/web:db:migrate`: makes this branch's development database
// if it's missing, and gives it this checkout's migrations. Drizzle's
// migrator applies only migrations newer than the last one applied, so it
// can't repair a history that differs from the checkout, such as one with a
// migration renumbered or edited after a rebase. Then the database is
// dropped and migrated afresh. Its data is lost; that is the price of a
// database that matches the code. `dev` and `sign-in-link` run this first;
// `mise run doctor` reads migrationState.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { type LocalDatabase, localDatabase } from "./database-names.ts";
import {
  databaseExists,
  migrateDatabase,
  resetDatabase,
} from "./local-databases.ts";

const MIGRATIONS_FOLDER = join(
  resolve(dirname(fileURLToPath(import.meta.url)), "../.."),
  "drizzle",
);
const CONNECTION_TIMEOUT_MS = 3000;
const UNDEFINED_TABLE = "42P01";

type MigrationState = "current" | "pending" | "diverged";

// Whether the database has exactly the checkout's migrations, lacks some,
// or has some the checkout doesn't. It changes nothing.
async function migrationState(
  database: LocalDatabase,
): Promise<MigrationState> {
  const client = new pg.Client({
    connectionString: database.url,
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
  });
  await client.connect();
  try {
    await client.query("SET statement_timeout = 3000");
    await client.query("BEGIN READ ONLY");
    let applied: Set<string>;
    try {
      const { rows } = await client.query<{ hash: string }>(
        "SELECT hash FROM drizzle.__drizzle_migrations",
      );
      applied = new Set(rows.map(({ hash }) => hash));
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
  } finally {
    await client.end();
  }
}

// Brings the database to the checkout's migrations, and says whether that
// took a reset.
async function prepareDatabase(database: LocalDatabase): Promise<boolean> {
  if (!(await databaseExists(database))) {
    await resetDatabase(database);
    return false;
  }
  if ((await migrationState(database)) === "diverged") {
    await resetDatabase(database);
    return true;
  }
  await migrateDatabase(database);
  // Migrations older than the last one applied are skipped, not applied.
  if ((await migrationState(database)) !== "current") {
    await resetDatabase(database);
    return true;
  }
  return false;
}

if (import.meta.main) {
  try {
    const database = localDatabase("dev");
    if (await prepareDatabase(database)) {
      console.log(
        `Reset ${database.name}: its migrations differed from this checkout's, so its data is gone.`,
      );
    } else {
      console.log(`${database.name} has this checkout's migrations.`);
    }
  } catch {
    // The error may hold connection details, so it isn't printed.
    console.error(
      "The development database is unavailable or its migrations failed: run mise run doctor, and check Docker.",
    );
    process.exitCode = 1;
  }
}

export { migrationState };
