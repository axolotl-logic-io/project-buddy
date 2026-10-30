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

// A user's own prompt: a buddy or an activity, as kind says, with a name
// and the kind's parts (BuddyParts in src/buddies/buddy.ts, ActivityParts in
// src/activities/activity.ts), which the prompt store validates when
// reading. cloned_from is what it was cloned from, a built-in prompt's id or
// another own prompt's uuid, as text, so it outlives its source; null for
// one written from scratch. The table keeps its name from when it held
// buddies alone; a row saved before kind was added is a buddy.
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
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("buddies_user_id_idx").on(table.userId),
    check("buddies_kind_known", sql`${table.kind} in ('buddy', 'activity')`),
  ],
);
