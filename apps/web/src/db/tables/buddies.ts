import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
// Relative imports: drizzle-kit loads this file without the @/ alias.
import { users } from "./users.ts";

// A buddy of the user's own: a name and every prompt part (BuddyParts in
// src/buddies/buddy.ts), which the buddy store validates when reading.
// cloned_from is what it was cloned from, a built-in buddy's id or another
// buddy's uuid, as text, so it outlives its source; null for one written
// from scratch.
// "personas" and "personas_user_id_idx" are the SQL names from before the
// buddy rename (#116); renaming them would need a migration.
export const buddies = pgTable(
  "personas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    parts: jsonb("parts").notNull(),
    clonedFrom: text("cloned_from"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("personas_user_id_idx").on(table.userId)],
);
