import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
// Relative imports: drizzle-kit loads this file without the @/ alias.
import { quests } from "./quests-and-chats.ts";
import { users } from "./users.ts";

// Each row records an event for its acting user. Removing a quest keeps
// the experience it earned. Unchecking a task or restoring a quest takes
// back the newest event for its source.
export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    event: text("event").notNull(),
    questId: uuid("quest_id").references(() => quests.id, {
      onDelete: "set null",
    }),
    source: text("source").notNull(),
    gainedAt: timestamp("gained_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("events_user_id_event_idx").on(table.userId, table.event),
    index("events_quest_id_event_source_idx").on(
      table.questId,
      table.event,
      table.source,
    ),
  ],
);
