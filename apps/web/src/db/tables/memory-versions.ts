import { sql } from "drizzle-orm";
import {
  check,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
// Relative imports: drizzle-kit loads this file without the @/ alias.
import { STORED_MEMORY_AUTHORS } from "../../memory/memory.ts";
import { projects } from "./projects-and-chats.ts";
import { users } from "./users.ts";

// The authors the table allows, as an SQL list, as stored: 'user' and 'buddy', a construct.
const MEMORY_AUTHOR_LIST = sql.raw(
  STORED_MEMORY_AUTHORS.map((author) => `'${author}'`).join(", "),
);

// Each row is one version of a project's memory, a Markdown text that every
// chat in the project shares. Versions count up from 1 per project with no
// gaps, and the newest is the memory. Rows are never changed, and are deleted
// only with their project. The author is one of STORED_MEMORY_AUTHORS. user_id is
// the person who saved a version whose author is 'user', so a team project's
// history can tell its people apart. Null on the construct's versions, on
// versions saved before savers were recorded, and once that person's account
// is deleted, which keeps the version.
export const memoryVersions = pgTable(
  "memory_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    text: text("text").notNull(),
    author: text("author").notNull(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("memory_versions_project_id_version_idx").on(
      table.projectId,
      table.version,
    ),
    check("memory_versions_version_positive", sql`${table.version} > 0`),
    check(
      "memory_versions_author_known",
      sql`${table.author} in (${MEMORY_AUTHOR_LIST})`,
    ),
  ],
);
