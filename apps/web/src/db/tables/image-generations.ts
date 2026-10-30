import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { chats } from "./projects-and-chats.ts";
import { users } from "./users.ts";

// A durable claim exists before the provider call. It prevents reply retries from
// spending twice and keeps the reserved cost if the process is interrupted.
const imageGenerations = pgTable(
  "image_generations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    chatId: uuid("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    requestId: text("request_id").notNull().unique(),
    prompt: text("prompt").notNull(),
    imageUrl: text("image_url"),
    status: text("status").notNull().default("pending"),
    month: text("month").notNull(),
    costMicroUsd: integer("cost_micro_usd").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("image_generations_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
  ],
);

export { imageGenerations };
