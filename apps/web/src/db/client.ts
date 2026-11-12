// Database connections for the app and Node scripts. Local URLs use native
// PostgreSQL; hosted Neon keeps its HTTP queries and WebSocket transactions.
import { Pool as NeonPool, neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { drizzle as drizzleOverNeonPool } from "drizzle-orm/neon-serverless";
import { drizzle as drizzleOverPool } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { Pool, type PoolClient } from "pg";
import { readDatabaseUrl } from "../env.ts";
import { logAppError } from "../errors/error-log.ts";
import { countServerQuery } from "../performance/query-counter.ts";

const LOCAL_HOSTS: ReadonlySet<string> = new Set([
  "localhost",
  "127.0.0.1",
  "[::1]",
]);

interface QueryRows<Row> {
  rows: Row[];
  rowCount: number | null;
}

type DatabasePool = Pick<Pool, "query" | "end"> & {
  connect: () => Promise<Pick<PoolClient, "query" | "release">>;
  options: Pick<
    Pool["options"],
    "connectionTimeoutMillis" | "query_timeout" | "statement_timeout"
  >;
};

// The result fields callers share across drivers; driver metadata stays here.
interface QueryResult extends PgQueryResultHKT {
  type: QueryRows<this["row"]>;
}
type Database = PgDatabase<QueryResult>;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

let database: Database | undefined;
let localPool: Pool | undefined;

// Local addresses use the PostgreSQL wire protocol, without a proxy.
function isOnThisMachine(host: string): boolean {
  return LOCAL_HOSTS.has(host);
}

// Created on first use so builds need no database. The local pool is reused
// across requests and lets Node exit when its connections are idle.
function getDb(): Database {
  if (database === undefined) {
    const url = readDatabaseUrl();
    const logger = { logQuery: countServerQuery };
    if (isOnThisMachine(new URL(url).hostname)) {
      localPool = new Pool({ connectionString: url, allowExitOnIdle: true });
      localPool.on("error", logIdleConnectionError);
      database = drizzleOverPool({
        client: localPool,
        logger,
      });
    } else {
      database = drizzle({ client: neon(url), logger });
    }
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
  const pool = localPool;
  database = undefined;
  localPool = undefined;
  await pool?.end();
}

// A PostgreSQL-compatible pool. Hosted Neon uses its WebSocket driver;
// local connections use TCP. Close a caller-owned pool with end(). Drizzle's
// adapters handle each driver’s transaction checkout.
function openPool(databaseUrl: string): DatabasePool {
  if (isOnThisMachine(new URL(databaseUrl).hostname)) {
    return new Pool({ connectionString: databaseUrl });
  }
  return new NeonPool({ connectionString: databaseUrl });
}

// Builds the matching adapter for a caller-owned pool.
function pooledDatabase(pool: DatabasePool): Database {
  if (pool instanceof Pool) {
    return drizzleOverPool(pool, { logger: { logQuery: countServerQuery } });
  }
  if (pool instanceof NeonPool) {
    return drizzleOverNeonPool(pool, {
      logger: { logQuery: countServerQuery },
    });
  }
  throw new Error("Unknown database pool driver.");
}

// Commits on success and rolls back on failure, on one checked-out connection.
async function inTransaction<T>(
  work: (tx: Transaction) => Promise<T>,
): Promise<T> {
  const pool = openPool(readDatabaseUrl());
  try {
    return await pooledDatabase(pool).transaction(work);
  } finally {
    await pool.end();
  }
}

export type { Database, Transaction };
export {
  closeDb,
  getDb,
  inTransaction,
  isOnThisMachine,
  openPool,
  pooledDatabase,
};
