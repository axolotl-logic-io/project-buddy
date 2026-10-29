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
import { MEMORY_AUTHORS } from "../../memory/memory.ts";
import { projects } from "./projects-and-chats.ts";

// The buddy's stored name before #549. Rows written before then keep it
// until a later release renames them; the store reads it as "buddy", and
// the constraint allows it until then.
export const RETIRED_BUDDY_AUTHOR = "tutor";

// The authors the table allows, as an SQL list, such as 'user', 'buddy'.
const MEMORY_AUTHOR_LIST = sql.raw(
  [...MEMORY_AUTHORS, RETIRED_BUDDY_AUTHOR]
    .map((author) => `'${author}'`)
    .join(", "),
);

// Each row is one version of a project's memory, a Markdown text that every
// chat in the project shares. Versions count up from 1 per project with no
// gaps, and the newest is the memory. Rows are never changed, and are deleted
// only with their project. The author is one of MEMORY_AUTHORS, or
// RETIRED_BUDDY_AUTHOR in a row written before #549.
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
