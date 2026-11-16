import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
// Relative imports: drizzle-kit loads this file without the @/ alias.
import { quests } from "./quests-and-chats.ts";
import { users } from "./users.ts";

// Each row is one point a user gained in an ability (src/experience/experience.ts)
// by doing something in a quest: source names what they did it to, a task's
// number, an idea's or Quick Note's id, or the quest's own id. A point stays
// when its quest goes, and goes with its user. Reopening a completed task or
// quest deletes the newest point its completion gave.
export const abilityPoints = pgTable(
  "ability_points",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ability: text("ability").notNull(),
    questId: uuid("quest_id").references(() => quests.id, {
      onDelete: "set null",
    }),
    source: text("source").notNull(),
    gainedAt: timestamp("gained_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ability_points_user_id_ability_idx").on(table.userId, table.ability),
    index("ability_points_quest_id_ability_source_idx").on(
      table.questId,
      table.ability,
      table.source,
    ),
  ],
);
