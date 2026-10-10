import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { readDatabaseUrl } from "@/env.ts";

let database: NeonHttpDatabase | undefined;

export type Database = NeonHttpDatabase;

// Created on first use rather than at import, so `next build` succeeds
// without DATABASE_URL as long as no page queries the database.
export function getDb(): Database {
  database ??= drizzle({ client: neon(readDatabaseUrl()) });
  return database;
}
