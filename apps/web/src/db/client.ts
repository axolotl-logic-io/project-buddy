// Connections to the app's Postgres database. Node scripts import this file
// too, so its imports are relative rather than path-aliased.
import {
  Client,
  type ClientConfig,
  type FetchEndpointOptions,
  type NeonConfig,
  neon,
  neonConfig,
  Pool,
} from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { readDatabaseUrl } from "../env.ts";

// Hosts of a database on this machine: the end-to-end test database, which
// runs in Docker behind Neon's local proxy (compose.test-db.yml). The proxy
// speaks Neon's HTTP and WebSocket protocols, unencrypted, at the connection
// string's own host and port.
const LOCAL_HOSTS: ReadonlySet<string> = new Set(["localhost", "127.0.0.1"]);

// Neon's driver settings are global, so these keep the driver's own endpoints
// for every host that is not on this machine.
function routeLocalHostsToProxy(): void {
  const neonFetchEndpoint: NeonConfig["fetchEndpoint"] =
    neonConfig.fetchEndpoint;
  const neonWsProxy: NeonConfig["wsProxy"] = neonConfig.wsProxy;
  neonConfig.fetchEndpoint = (
    host: string,
    port: number | string,
    options?: FetchEndpointOptions,
  ): string => {
    if (isOnThisMachine(host)) {
      return `http://${host}:${port}/sql`;
    }
    if (typeof neonFetchEndpoint === "string") {
      return neonFetchEndpoint;
    }
    return neonFetchEndpoint(host, port, options);
  };
  neonConfig.wsProxy = (host: string, port: number | string): string => {
    if (isOnThisMachine(host)) {
      return `${host}:${port}/v2`;
    }
    if (typeof neonWsProxy === "string") {
      return neonWsProxy;
    }
    return neonWsProxy(host, port);
  };
}

routeLocalHostsToProxy();

// A connection to the local proxy, which speaks WebSocket unencrypted. The
// setting is the client's own, so pools to Neon keep the encrypted default.
class LocalProxyClient extends Client {
  constructor(config?: string | ClientConfig) {
    super(config);
    this.neonConfig.useSecureWebSocket = false;
  }
}

let database: NeonHttpDatabase | undefined;

export type Database = NeonHttpDatabase;

// Whether a database at host is on this machine, and so is the local test
// database rather than a Neon one.
export function isOnThisMachine(host: string): boolean {
  return LOCAL_HOSTS.has(host);
}

// Created on first use rather than at import, so `next build` succeeds
// without DATABASE_URL as long as no page queries the database.
export function getDb(): Database {
  database ??= drizzle({ client: neon(readDatabaseUrl()) });
  return database;
}

// A WebSocket connection pool to the database at databaseUrl, for work that
// needs transactions, which the HTTP driver lacks. Close it with `end()`.
// Each pool's connections are encrypted unless its database is on this
// machine, whatever other pools are open.
export function openPool(databaseUrl: string): Pool {
  const pool = new Pool({ connectionString: databaseUrl });
  if (isOnThisMachine(new URL(databaseUrl).hostname)) {
    // Neon's Pool makes its clients from this field, and ignores the
    // `Client` option of node-postgres.
    pool.Client = LocalProxyClient;
  }
  return pool;
}
