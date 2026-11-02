import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
// Relative imports: drizzle-kit loads this file without the @/ alias.
import { chats, projects } from "./projects-and-chats.ts";

// Each row is one milestone of a project's progress timeline: something the
// user got done, as the buddy recorded it in one of the project's chats. It
// belongs to its project's user (src/accounts/owner-scope.ts), and goes with
// its project or its chat. The user can change its text or delete it;
// recorded_at stays as the buddy recorded it.
export const milestones = pgTable(
  "milestones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    chatId: uuid("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
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
