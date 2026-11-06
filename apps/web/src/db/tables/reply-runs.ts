import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { chats, messages } from "./projects-and-chats.ts";
import { users } from "./users.ts";

// Attempts are durable so Stop works across workers and after a reload.
const replyRuns = pgTable(
  "reply_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chatId: uuid("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    messageId: text("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    cancelRequested: boolean("cancel_requested").notNull().default(false),
    status: text("status").notNull().default("active"),
    accountingComplete: boolean("accounting_complete").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("reply_runs_chat_message_idx").on(table.chatId, table.messageId),
  ],
);

export { replyRuns };
