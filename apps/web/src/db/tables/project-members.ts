import {
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
// Relative imports: drizzle-kit loads this file without the @/ alias.
import { projects } from "./projects-and-chats.ts";
import { users } from "./users.ts";

// Each row makes a user a member of a team project: someone besides its
// owner (projects.user_id) who shares its chats, memory, notes and progress
// timeline (src/accounts/owner-scope.ts). A user is a member of a project at
// most once, and never of their own. A row goes when the member leaves or
// the owner removes them, and with its project or its user.
export const projectMembers = pgTable(
  "project_members",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("project_members_project_id_user_id_idx").on(
      table.projectId,
      table.userId,
    ),
    index("project_members_user_id_idx").on(table.userId),
  ],
);
