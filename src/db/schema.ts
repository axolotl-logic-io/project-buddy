// Drizzle table definitions. drizzle.config.ts points drizzle-kit here, and
// src/db/client.ts passes these exports to drizzle() for relational queries.
// Each feature keeps its tables in src/db/tables/ and re-exports them here.
export * from "@/db/tables/failed-logins";
