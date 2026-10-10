import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema.ts";
import { readDatabaseUrl } from "@/env.ts";

export type Database = NeonHttpDatabase<typeof schema>;

let database: Database | undefined;

// Created on first use rather than at import, so `next build` succeeds
// without DATABASE_URL as long as no page queries the database.
export function getDb(): Database {
  database ??= drizzle({ client: neon(readDatabaseUrl()), schema });
  return database;
}
