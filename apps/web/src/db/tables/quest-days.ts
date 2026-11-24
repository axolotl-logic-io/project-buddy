import {
  date,
  index,
  jsonb,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { quests } from "./quests.ts";

// Retired: Start Day recorded these days, and no code reads or writes them
// now. The next release drops the table, once no live build reads it.
const questDays = pgTable(
  "quest_days",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questId: uuid("quest_id")
      .notNull()
      .references(() => quests.id, { onDelete: "cascade" }),
    localDate: date("local_date", { mode: "string" }).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    tasks: jsonb("tasks"),
    undo: jsonb("undo"),
  },
  (table) => [index("quest_days_order_idx").on(table.questId, table.startedAt)],
);

export { questDays };
