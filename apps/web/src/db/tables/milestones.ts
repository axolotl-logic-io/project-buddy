import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
// Relative imports: drizzle-kit loads this file without the @/ alias.
import { chats, projects } from "./projects-and-chats.ts";

// Each row is one milestone of a project's progress timeline: something the
// user got done, as the construct recorded it in the project's conversation.
// It is open to everyone in its project (src/accounts/owner-scope.ts), and
// goes with its project; chat_id, the conversation it was recorded in, is
// null once that conversation is gone, as the later removal of legacy
// adventures (#898) leaves it. The user can change its text or delete it;
// recorded_at stays as the construct recorded it.
export const milestones = pgTable(
  "milestones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    chatId: uuid("chat_id").references(() => chats.id, {
      onDelete: "set null",
    }),
    text: text("text").notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("milestones_project_id_recorded_at_idx").on(
      table.projectId,
      table.recordedAt,
    ),
  ],
);
