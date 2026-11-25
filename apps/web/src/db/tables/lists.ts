import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { quests } from "./quests.ts";

const lists = pgTable(
  "lists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questId: uuid("quest_id")
      .notNull()
      .references(() => quests.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    version: integer("version").notNull().default(0),
  },
  (table) => [
    unique("lists_quest_id_id_key").on(table.questId, table.id),
    uniqueIndex("lists_quest_position_idx").on(table.questId, table.position),
    check(
      "lists_type_valid",
      sql`${table.type} in ('plain', 'task', 'quick-note', 'tally')`,
    ),
  ],
);

const listItems = pgTable(
  "list_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questId: uuid("quest_id").notNull(),
    listId: uuid("list_id").notNull(),
    position: integer("position").notNull(),
    text: text("text").notNull(),
    taskNumber: integer("task_number"),
    checkedOff: boolean("checked_off").notNull().default(false),
    // The quest owner's calendar date when the task was checked off. A
    // recurring task counts as checked off only in the day, week or month
    // that holds that date, by its cadence.
    checkedOffOn: date("checked_off_on", { mode: "string" }),
    recurring: boolean("recurring").notNull().default(false),
    // How often a recurring task repeats. A one-off task keeps the cadence
    // it last had, which it takes again if it is made recurring.
    cadence: text("cadence", { enum: ["daily", "weekly", "monthly"] })
      .notNull()
      .default("daily"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.questId, table.listId],
      foreignColumns: [lists.questId, lists.id],
    }).onDelete("cascade"),
    index("list_items_list_position_idx").on(table.listId, table.position),
    uniqueIndex("list_items_quest_task_number_idx").on(
      table.questId,
      table.taskNumber,
    ),
    check(
      "list_items_cadence_valid",
      sql`${table.cadence} in ('daily', 'weekly', 'monthly')`,
    ),
  ],
);

export { listItems, lists };
