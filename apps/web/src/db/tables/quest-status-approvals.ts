import { sql } from "drizzle-orm";
import {
  check,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { chats, projects } from "./projects-and-chats.ts";
import { users } from "./users.ts";

// An immutable proposal. Only its requesting owner can answer it; its quest
// revision makes an old card unusable after any later status change.
const questStatusApprovals = pgTable(
  "quest_status_approvals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    chatId: uuid("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fromStatus: text("from_status").notNull(),
    toStatus: text("to_status").notNull(),
    revision: integer("revision").notNull(),
    decision: text("decision").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "quest_status_approval_decision_valid",
      sql`${table.decision} in ('pending', 'approved', 'declined')`,
    ),
    check(
      "quest_status_approval_from_valid",
      sql`${table.fromStatus} in ('active', 'completed', 'abandoned')`,
    ),
    check(
      "quest_status_approval_to_valid",
      sql`${table.toStatus} in ('active', 'completed', 'abandoned')`,
    ),
  ],
);

export { questStatusApprovals };
