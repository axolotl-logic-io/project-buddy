import { pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
// Relative imports: drizzle-kit loads this file without the @/ alias.
import { chats } from "./projects-and-chats.ts";
import { users } from "./users.ts";

// A row marks a chat unread for one user, at most once: the user hasn't
// opened the chat since it was marked, as a check-in marks it
// (src/chats/unread-marks.ts). Opening the chat deletes that user's row and
// no one else's. The rows replace chats.unread, which no code reads now; a
// later release drops that column.
export const chatUnreads = pgTable(
  "chat_unreads",
  {
    chatId: uuid("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("chat_unreads_chat_id_user_id_idx").on(
      table.chatId,
      table.userId,
    ),
  ],
);
