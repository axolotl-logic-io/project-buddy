import { sql } from "drizzle-orm";
import {
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
// Relative imports: drizzle-kit loads this file without the @/ alias.
import { users } from "./users.ts";

// Own buddies, activities and spells share persistence and source tracking.
// The legacy parts JSON is validated and converted by each definition's codec.
// Keep this table and its columns compatible with the live build.
export const buddies = pgTable(
  "buddies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("buddy"),
    name: text("name").notNull(),
    parts: jsonb("parts").notNull(),
    clonedFrom: text("cloned_from"),
    boughtFrom: uuid("bought_from"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("buddies_user_id_idx").on(table.userId),
    check(
      "buddies_kind_known",
      sql`${table.kind} in ('buddy', 'activity', 'spell')`,
    ),
  ],
);
