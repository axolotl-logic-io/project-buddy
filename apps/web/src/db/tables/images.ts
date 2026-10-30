import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { chats } from "./projects-and-chats.ts";

// Private image bytes live with their chat, including unsent drafts. Deleting
// a chat or its project deletes its images in the same database cascade.
const images = pgTable(
  "images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chatId: uuid("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    mediaType: text("media_type").notNull(),
    data: text("data").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("images_chat_id_idx").on(table.chatId)],
);

export { images };
