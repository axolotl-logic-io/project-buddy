import { boolean, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { chats, messages, projects } from "./projects-and-chats.ts";
import { users } from "./users.ts";

const questTransfers = pgTable(
  "quest_transfers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sourceChatId: uuid("source_chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    sourceMessageId: text("source_message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    summary: text("summary").notNull(),
    completed: boolean("completed").notNull().default(false),
    motivation: text("motivation").notNull().default(""),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    targetChatId: uuid("target_chat_id").references(() => chats.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    uniqueIndex("quest_transfer_one_per_message").on(
      table.userId,
      table.sourceMessageId,
    ),
  ],
);

export { questTransfers };
