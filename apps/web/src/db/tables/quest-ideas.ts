import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { quests } from "./quests-and-chats.ts";

// Possibilities kept separately from agreed Plan steps; deleted with the quest.
const questIdeas = pgTable(
  "quest_ideas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questId: uuid("quest_id")
      .notNull()
      .references(() => quests.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("quest_ideas_quest_id_idx").on(table.questId)],
);

export { questIdeas };
