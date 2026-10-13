import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Failed invite code attempts per client, counted within a fixed window that
// starts at the first failure. See src/auth/failed-logins.ts.
export const failedLogins = pgTable("failed_logins", {
  clientKey: text("client_key").primaryKey(),
  failures: integer("failures").notNull(),
  windowStartedAt: timestamp("window_started_at", {
    withTimezone: true,
  }).notNull(),
});
