import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users.ts";

// A quest belongs to its owner and is open to them and its accepted members
// (quest_members, src/accounts/owner-scope.ts).
export const quests = pgTable(
  "quests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    startingContext: text("starting_context"),
    status: text("status").notNull().default("active"),
    statusRevision: integer("status_revision").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    dailies: boolean("dailies").notNull().default(false),
    constructId: text("construct_id").notNull().default("vellum"),
    nextTaskNumber: integer("next_task_number").notNull().default(1),
  },
  (table) => [
    index("quests_user_id_idx").on(table.userId),
    uniqueIndex("quests_dailies_user_idx")
      .on(table.userId)
      .where(sql`${table.dailies}`),
    check(
      "quests_status_valid",
      sql`${table.status} in ('active', 'completed', 'abandoned')`,
    ),
    check("quests_status_revision_valid", sql`${table.statusRevision} >= 0`),
  ],
);
