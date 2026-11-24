import { date, numeric, pgTable, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { quests } from "./quests.ts";

// A tally's total on one date in its quest owner's time zone. A row is
// kept by its tally's list item id without a foreign key, so removing the
// tally and undoing the removal brings its days back; reads join the list
// item, so a removed tally's days are never shown.
const tallyDays = pgTable(
  "tally_days",
  {
    questId: uuid("quest_id")
      .notNull()
      .references(() => quests.id, { onDelete: "cascade" }),
    listItemId: uuid("list_item_id").notNull(),
    localDate: date("local_date", { mode: "string" }).notNull(),
    total: numeric("total", { precision: 18, scale: 6 }).notNull(),
  },
  (table) => [
    uniqueIndex("tally_days_item_date_idx").on(
      table.listItemId,
      table.localDate,
    ),
  ],
);

export { tallyDays };
