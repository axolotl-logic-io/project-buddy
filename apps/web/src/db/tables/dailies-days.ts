import {
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
// Relative imports: drizzle-kit loads this file without the @/ alias.
import { chats, quests } from "./quests-and-chats.ts";

// Each row is one day of a Dailies quest, begun by Start Day
// (src/dailies/day-store.ts reads and writes them). local_date is the date
// the user's browser was on. tasks, saved in the steps column, is null
// while the day is still going: the next Start Day sets it to the recurring
// tasks as the day ended, with whether each was done. chat_id is the day's conversation.
//
// The rest is what Undo needs to put back the day before, until someone
// sends a message in the day's conversation: parked_chat_id is the
// conversation before, parked outside its quest with its spell kept here,
// and it is deleted at the next Start Day; tasks_version is the tasks
// version Start Day saved; removed_ideas are the Ideas it removed. A row
// goes with its quest.
export const dailiesDays = pgTable(
  "dailies_days",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questId: uuid("quest_id")
      .notNull()
      .references(() => quests.id, { onDelete: "cascade" }),
    localDate: date("local_date", { mode: "string" }).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    tasks: jsonb("steps"),
    chatId: uuid("chat_id").references(() => chats.id, {
      onDelete: "set null",
    }),
    parkedChatId: uuid("parked_chat_id").references(() => chats.id, {
      onDelete: "set null",
    }),
    parkedSpell: text("parked_spell"),
    parkedSpellSnapshot: jsonb("parked_spell_snapshot"),
    tasksVersion: integer("tasks_version"),
    removedIdeas: jsonb("removed_ideas"),
  },
  (table) => [
    index("dailies_days_quest_id_started_at_idx").on(
      table.questId,
      table.startedAt,
    ),
  ],
);
