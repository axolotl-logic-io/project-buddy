import {
  date,
  integer,
  pgTable,
  // biome-ignore lint/suspicious/noDeprecatedImports: the rule checks imports, not calls, so it can't tell drizzle's overloads apart. The { columns } overload used below is not deprecated; only the variadic one is. https://github.com/biomejs/biome/issues/7636
  primaryKey,
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
  (table) => [primaryKey({ columns: [table.userId, table.month] })],
);
