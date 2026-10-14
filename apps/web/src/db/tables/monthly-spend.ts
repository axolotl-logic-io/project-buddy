import {
  date,
  integer,
  PrimaryKeyBuilder,
  pgTable,
  uuid,
} from "drizzle-orm/pg-core";
// Relative imports: drizzle-kit loads this file without the @/ alias.
import { users } from "./users.ts";

// What each user's Claude calls cost in a calendar month (UTC), in
// millionths of a US dollar. month is the month's first day.
export const monthlySpend = pgTable(
  "monthly_spend",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    month: date("month").notNull(),
    microUsd: integer("micro_usd").notNull(),
  },
  // primaryKey({ columns }) once Biome's noDeprecatedImports tells its
  // overloads apart: it reports the whole function because one is deprecated.
  (table) => [new PrimaryKeyBuilder([table.userId, table.month])],
);
