import { pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
// Relative imports: drizzle-kit loads this file without the @/ alias.
import { chats } from "./projects-and-chats.ts";
import { users } from "./users.ts";

// Inert: a row marked a chat unread for one user after a check-in, which
// the site no longer writes or reads (#903). The table stays until a held
// cleanup drops it, once no live build reads it.
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
