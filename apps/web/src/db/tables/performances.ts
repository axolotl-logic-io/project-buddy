import { sql } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { lists } from "./lists.ts";
import { users } from "./users.ts";

const rites = pgTable(
  "rites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    firstMessage: text("first_message").notNull(),
    replies: jsonb("replies").notNull(),
    order: text("reply_order").notNull().default("random"),
    loop: boolean("loop").notNull().default(true),
    finalReply: text("final_reply").notNull().default(""),
    forgottenAt: timestamp("forgotten_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("rites_user_idx").on(table.userId)],
);

const performances = pgTable(
  "performances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questId: uuid("quest_id").notNull(),
    listId: uuid("list_id").notNull(),
    riteSnapshot: jsonb("rite_snapshot").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    closing: text("closing"),
    added: integer("added").notNull().default(0),
  },
  (table) => [
    foreignKey({
      columns: [table.questId, table.listId],
      foreignColumns: [lists.questId, lists.id],
    }).onDelete("cascade"),
    index("performances_quest_started_idx").on(table.questId, table.startedAt),
    uniqueIndex("performances_active_quest_idx")
      .on(table.questId)
      .where(sql`${table.endedAt} is null`),
  ],
);

const performanceMessages = pgTable(
  "performance_messages",
  {
    id: uuid("id").primaryKey(),
    performanceId: uuid("performance_id")
      .notNull()
      .references(() => performances.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    author: text("author").notNull(),
    text: text("text").notNull(),
    reply: text("reply").notNull(),
    // Which of the rite's replies answered the message, by place; null for
    // its final reply and for a message the list couldn't hold.
    replyIndex: integer("reply_index"),
    added: integer("added").notNull(),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("performance_messages_performance_position_idx").on(
      table.performanceId,
      table.position,
    ),
  ],
);

export { performanceMessages, performances, rites };
