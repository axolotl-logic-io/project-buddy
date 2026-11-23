import { sql } from "drizzle-orm";
import {
  boolean,
  check,
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

const spaces = pgTable(
  "spaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questId: uuid("quest_id")
      .notNull()
      .references(() => quests.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    name: text("name").notNull(),
    singular: text("singular").notNull(),
    plural: text("plural").notNull(),
    checkOff: text("check_off").notNull(),
    uncheck: text("uncheck").notNull(),
    newType: text("new_type").notNull(),
    version: integer("version").notNull().default(0),
  },
  (table) => [
    unique("spaces_quest_id_id_key").on(table.questId, table.id),
    uniqueIndex("spaces_quest_position_idx").on(table.questId, table.position),
    check(
      "spaces_type_valid",
      sql`${table.newType} in ('plain', 'task', 'quick-note')`,
    ),
  ],
);

const murmlings = pgTable(
  "murmlings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questId: uuid("quest_id").notNull(),
    spaceId: uuid("space_id").notNull(),
    position: integer("position").notNull(),
    text: text("text").notNull(),
    type: text("type").notNull(),
    taskNumber: integer("task_number"),
    checkedOff: boolean("checked_off").notNull().default(false),
    recurring: boolean("recurring").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.questId, table.spaceId],
      foreignColumns: [spaces.questId, spaces.id],
    }).onDelete("cascade"),
    index("murmlings_space_position_idx").on(table.spaceId, table.position),
    uniqueIndex("murmlings_quest_task_number_idx").on(
      table.questId,
      table.taskNumber,
    ),
    check(
      "murmlings_type_valid",
      sql`(${table.type} = 'task' and ${table.taskNumber} > 0 and ${table.taskNumber} is not null)
        or (${table.type} in ('plain', 'quick-note') and ${table.taskNumber} is null
          and not ${table.checkedOff} and not ${table.recurring})`,
    ),
  ],
);

export { murmlings, spaces };
