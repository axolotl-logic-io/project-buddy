import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
// Relative imports: drizzle-kit loads this file without the @/ alias.
import { chats } from "./projects-and-chats.ts";

// Each row is one activity session: the stretch of a chat spent in one
// activity, from the row's start until the chat's next session. The activity
// is a snapshot, activity_name and activity_parts, taken when the chat
// entered it, so editing the activity later leaves the chat as it was.
// activity_id is the built-in activity's id or the own activity's uuid, as
// text, so it outlives its source. start_message_id is the user message
// whose reply entered the activity, or that the user changed it after; null
// for the chat's first activity, which starts with its opening. A chat's
// rows, oldest first, are its activities in order; the newest is its
// current activity. A row belongs to its chat's owner.
export const activitySessions = pgTable(
  "activity_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chatId: uuid("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    activityId: text("activity_id").notNull(),
    activityName: text("activity_name").notNull(),
    activityParts: jsonb("activity_parts").notNull(),
    startMessageId: text("start_message_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("activity_sessions_chat_id_idx").on(table.chatId, table.createdAt),
  ],
);
