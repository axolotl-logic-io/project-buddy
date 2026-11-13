import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { chats, messages } from "./quests-and-chats.ts";

const spellMessageResults = pgTable("spell_message_results", {
  messageId: text("message_id")
    .primaryKey()
    .references(() => messages.id, { onDelete: "cascade" }),
  chatId: uuid("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
});

export { spellMessageResults };
