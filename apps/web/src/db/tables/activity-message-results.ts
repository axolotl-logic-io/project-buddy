import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { chats, messages } from "./quests-and-chats.ts";

// One deterministic Activity result per user message, retained across retries.
const activityMessageResults = pgTable("activity_message_results", {
  messageId: text("message_id")
    .primaryKey()
    .references(() => messages.id, { onDelete: "cascade" }),
  chatId: uuid("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
});

export { activityMessageResults };
