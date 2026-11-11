import { sql } from "drizzle-orm";
import {
  check,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { projects } from "./projects-and-chats.ts";
import { users } from "./users.ts";

// Additive typed-section history. Older builds continue using free notes.
export const journalVersions = pgTable(
  "journal_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    version: integer("version").notNull(),
    content: jsonb("content").notNull(),
    before: jsonb("before").notNull(),
    author: text("author").notNull(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    undoesVersion: integer("undoes_version"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("journal_versions_section_version_idx").on(
      table.projectId,
      table.kind,
      table.version,
    ),
    uniqueIndex("journal_versions_section_undo_idx").on(
      table.projectId,
      table.kind,
      table.undoesVersion,
    ),
    check(
      "journal_versions_kind_valid",
      sql`${table.kind} in ('goal', 'preferences')`,
    ),
    check(
      "journal_versions_author_valid",
      sql`${table.author} in ('person', 'construct')`,
    ),
    check("journal_versions_version_positive", sql`${table.version} > 0`),
  ],
);
