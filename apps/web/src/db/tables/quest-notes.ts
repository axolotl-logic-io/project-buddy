import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { quests } from "./quests-and-chats.ts";

// A quest's Quick Notes, short lines its owner saved without opening it;
// deleted with the quest.
const questNotes = pgTable(
  "quest_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questId: uuid("quest_id")
      .notNull()
      .references(() => quests.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("quest_notes_quest_id_idx").on(table.questId)],
);

export { questNotes };
