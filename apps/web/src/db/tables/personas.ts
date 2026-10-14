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

// A persona of the user's own: a name and every prompt part (PersonaParts in
// src/personas/persona.ts), which the persona store validates when reading.
// cloned_from is what it was cloned from, a built-in persona's id or another
// persona's uuid, as text, so it outlives its source; null for one written
// from scratch.
export const personas = pgTable(
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
