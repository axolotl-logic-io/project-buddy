import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
// Relative imports: drizzle-kit loads this file without the @/ alias.
import { chats, quests } from "./quests-and-chats.ts";
import { users } from "./users.ts";

// Each row is one saved version of a quest's plan, from 1 up: the whole
// plan after one change, what the change did and the operations that undo it
// (src/plan/plan-store.ts reads and writes them). The newest version is the
// plan. A change that undoes another names that version in undoes_version.
// author is "construct" or "person"; user_id is the person who made it, null
// on the construct's changes and once their account is gone. chat_id is the
// chat the change was made in, if any; the plan's history outlives the chat.
// A version is open to everyone in its quest (src/accounts/owner-scope.ts)
// and goes with its quest.
export const planVersions = pgTable(
  "plan_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questId: uuid("quest_id")
      .notNull()
      .references(() => quests.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    plan: jsonb("plan").notNull(),
    lines: jsonb("lines").notNull(),
    undo: jsonb("undo").notNull(),
    undoesVersion: integer("undoes_version"),
    author: text("author").notNull(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    chatId: uuid("chat_id").references(() => chats.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("plan_versions_quest_id_version_idx").on(
      table.questId,
      table.version,
    ),
    // A change is undone at most once: NULLs, on changes that undo
    // nothing, never collide.
    uniqueIndex("plan_versions_quest_id_undoes_version_idx").on(
      table.questId,
      table.undoesVersion,
    ),
    index("plan_versions_chat_id_idx").on(table.chatId),
  ],
);
