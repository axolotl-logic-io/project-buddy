// Making, migrating, listing and dropping the local databases that
// database-names.ts names. Each database made here records its owner in its
// Postgres comment, so a prune can tell which ones a deleted branch left.
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { z } from "zod";
import {
  checkoutOwner,
  type DatabaseOwner,
  isLocalDatabaseName,
  type LocalDatabase,
} from "./database-names.ts";

const MIGRATIONS_FOLDER = join(
  resolve(dirname(fileURLToPath(import.meta.url)), "../.."),
  "drizzle",
);
// The database a client connects to while it makes or drops another.
const MAINTENANCE_DATABASE = "postgres";
// Bound an unavailable server or a stuck statement.
const OPERATION_TIMEOUT_MS = 30_000;
const OWNER = z.object({
  repository: z.string().min(1),
  branch: z.string().min(1).nullable(),
  worktree: z.string().min(1),
});

// A database on a local server, with its owner if it recorded one.
interface ServerDatabase extends LocalDatabase {
  readonly owner: DatabaseOwner | undefined;
}

function checkedName({ name }: LocalDatabase): string {
  if (!isLocalDatabaseName(name)) {
    throw new Error(`"${name}" is not a local database name.`);
  }
  return name;
}

function urlOn(database: LocalDatabase, name: string): string {
  const url = new URL(database.url);
  url.pathname = `/${name}`;
  return url.href;
}

// Runs work on the maintenance database of database's server.
async function onServer<T>(
  database: LocalDatabase,
  work: (client: pg.Client) => Promise<T>,
): Promise<T> {
  const client = new pg.Client({
    connectionString: urlOn(database, MAINTENANCE_DATABASE),
    connectionTimeoutMillis: OPERATION_TIMEOUT_MS,
  });
  await client.connect();
  try {
    await client.query(`SET statement_timeout = ${OPERATION_TIMEOUT_MS}`);
    return await work(client);
  } finally {
    await client.end();
  }
}

function parseOwner(comment: string | null): DatabaseOwner | undefined {
  if (comment === null) {
    return undefined;
  }
  try {
    return OWNER.parse(JSON.parse(comment));
  } catch {
    return undefined;
  }
}

async function databaseExists(database: LocalDatabase): Promise<boolean> {
  return await onServer(database, async (client) => {
    const { rowCount } = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [checkedName(database)],
    );
    return rowCount === 1;
  });
}

// Applies the checkout's migrations that the database doesn't have yet.
async function migrateDatabase(database: LocalDatabase): Promise<void> {
  checkedName(database);
  const pool = new pg.Pool({ connectionString: database.url, max: 1 });
  try {
    await migrate(drizzle({ client: pool }), {
      migrationsFolder: MIGRATIONS_FOLDER,
    });
  } finally {
    await pool.end();
  }
}

// Drops the database if it exists, closing its connections. Dropping one
// that is already gone does nothing.
async function dropDatabase(database: LocalDatabase): Promise<void> {
  const name = checkedName(database);
  await onServer(database, async (client) => {
    await client.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
  });
}

// Drops the database if it exists and makes it afresh for this checkout,
// with the checkout's migrations and no rows.
async function resetDatabase(database: LocalDatabase): Promise<void> {
  const name = checkedName(database);
  const owner = JSON.stringify(checkoutOwner());
  await onServer(database, async (client) => {
    await client.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await client.query(`CREATE DATABASE ${name}`);
    await client.query(
      `COMMENT ON DATABASE ${name} IS ${client.escapeLiteral(owner)}`,
    );
  });
  await migrateDatabase(database);
}

// The databases database-names.ts names on database's server, from any
// checkout, with the owner each recorded.
async function serverDatabases(
  database: LocalDatabase,
): Promise<ServerDatabase[]> {
  return await onServer(database, async (client) => {
    const { rows } = await client.query<{
      name: string;
      comment: string | null;
    }>(
      "SELECT datname AS name, shobj_description(oid, 'pg_database') AS comment FROM pg_database",
    );
    return rows
      .filter(({ name }) => isLocalDatabaseName(name))
      .map(({ name, comment }) => ({
        name,
        url: urlOn(database, name),
        owner: parseOwner(comment),
      }));
  });
}

export type { ServerDatabase };
export {
  databaseExists,
  dropDatabase,
  migrateDatabase,
  resetDatabase,
  serverDatabases,
};
