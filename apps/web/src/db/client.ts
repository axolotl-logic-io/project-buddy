// Database connections for the app and Node scripts. Every database, local or
// hosted Neon, is reached with node-postgres over TCP, so the app runs on the
// same driver its tests do. Hosted Neon is reached through its pooler URL,
// which shares a few Postgres connections among every function instance.
import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { Pool } from "pg";
import { readDatabaseUrl } from "../env.ts";
import { logAppError } from "../errors/error-log.ts";

interface QueryRows<Row> {
  rows: Row[];
  rowCount: number | null;
}

// The result fields callers share; driver metadata stays here.
interface QueryResult extends PgQueryResultHKT {
  type: QueryRows<this["row"]>;
}
type Database = PgDatabase<QueryResult>;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

let database: Database | undefined;
let appPool: Pool | undefined;

// Created on first use so builds need no database. The pool is reused across
// requests and lets Node exit when its connections are idle. On Vercel,
// attachDatabasePool keeps a suspended instance alive just long enough to
// close its idle connections; elsewhere it does nothing.
function getDb(): Database {
  if (database === undefined) {
    appPool = new Pool({
      connectionString: readDatabaseUrl(),
      allowExitOnIdle: true,
    });
    appPool.on("error", logIdleConnectionError);
    attachDatabasePool(appPool);
    database = drizzle({ client: appPool });
  }
  return database;
}

// An idle client's failure is emitted outside any query. pg removes that
// client and replaces it on demand; report the failure without crashing Node.
function logIdleConnectionError(error: Error): void {
  logAppError("database-unreachable", "idle database connection", error);
}

// Releases the cached connections before shutting down or changing databases.
async function closeDb(): Promise<void> {
  const pool = appPool;
  database = undefined;
  appPool = undefined;
  await pool?.end();
}

// A pool a script or test owns, apart from the app's. Close it with end().
function openPool(databaseUrl: string): Pool {
  return new Pool({ connectionString: databaseUrl });
}

// The drizzle database over a caller-owned pool.
function pooledDatabase(pool: Pool): Database {
  return drizzle({ client: pool });
}

// Commits on success and rolls back on failure, on one checked-out
// connection of the app's pool.
function inTransaction<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
  return getDb().transaction(work);
}

export type { Database, Transaction };
export { closeDb, getDb, inTransaction, openPool, pooledDatabase };
