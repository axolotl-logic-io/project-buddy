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
    checkOff: text("check_off").notNull(),
    uncheck: text("uncheck").notNull(),
    type: text("type").notNull(),
    version: integer("version").notNull().default(0),
  },
  (table) => [
    unique("lists_quest_id_id_key").on(table.questId, table.id),
    uniqueIndex("lists_quest_position_idx").on(table.questId, table.position),
    check(
      "lists_type_valid",
      sql`${table.type} in ('plain', 'task', 'quick-note')`,
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
    // recurring task counts as checked off only on that date.
    checkedOffOn: date("checked_off_on", { mode: "string" }),
    recurring: boolean("recurring").notNull().default(false),
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
  ],
);

export { listItems, lists };
