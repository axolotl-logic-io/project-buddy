import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Requests counted per key, such as an email address or a client, within a
// fixed window that starts at the key's first request.
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  windowStartedAt: timestamp("window_started_at", {
    withTimezone: true,
  }).notNull(),
});
