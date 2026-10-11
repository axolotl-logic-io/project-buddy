// The row a memory write inserts: the version after the one the write was
// based on. It is built as a select for `insert … select`, so the check that
// the write is current and the insert are one statement, and drizzle checks
// its columns against the table's when the insert is built.
import { and, eq, ne, type SQL, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  type PgInsertSelectQueryBuilder,
  QueryBuilder,
} from "drizzle-orm/pg-core";
import { memoryVersions } from "@/db/tables/memory-versions.ts";
import type { ProjectId } from "@/ids.ts";
import type { MemoryAuthor, MemoryVersionNumber } from "@/memory/memory.ts";

// The next version's text: new text, or a copy of an earlier version's.
type NextVersionText =
  | { readonly kind: "new"; readonly text: string }
  | { readonly kind: "copy"; readonly version: MemoryVersionNumber };

interface NextMemoryVersion {
  readonly projectId: ProjectId;
  readonly basedOn: MemoryVersionNumber;
  readonly author: MemoryAuthor;
  readonly text: NextVersionText;
}

// A new version's columns, keyed and ordered as the table's are.
type VersionColumns = {
  readonly [Column in keyof Required<typeof memoryVersions.$inferInsert>]:
    | SQL
    | AnyPgColumn;
};

function versionColumns(
  { projectId, basedOn, author }: NextMemoryVersion,
  text: SQL | AnyPgColumn,
): VersionColumns {
  return {
    id: sql`gen_random_uuid()`,
    projectId: sql`${projectId}::uuid`,
    version: sql`${basedOn}::integer + 1`,
    text,
    author: sql`${author}::text`,
    createdAt: sql`now()`,
  };
}

// The select that yields the next version's row. It yields none when a
// version newer than basedOn exists, when new text equals basedOn's text, or
// when the version to copy doesn't exist.
function selectNextMemoryVersion(
  next: NextMemoryVersion,
): PgInsertSelectQueryBuilder<typeof memoryVersions> {
  const qb = new QueryBuilder();
  // The project's newest version as one row: its number and text, or 0
  // and the empty text when nothing is saved. The names are unique, so the
  // outer query can use them unqualified.
  const newest = qb
    .select({
      version: sql<number>`coalesce(max(${memoryVersions.version}), 0)`.as(
        "newest_version",
      ),
      text: sql<string>`coalesce((array_agg(${memoryVersions.text} order by ${memoryVersions.version} desc))[1], '')`.as(
        "newest_text",
      ),
    })
    .from(memoryVersions)
    .where(eq(memoryVersions.projectId, next.projectId))
    .as("newest");
  const { text } = next;
  switch (text.kind) {
    case "new":
      return qb
        .select(versionColumns(next, sql`${text.text}::text`))
        .from(newest)
        .where(
          and(eq(newest.version, next.basedOn), ne(newest.text, text.text)),
        );
    case "copy":
      return qb
        .select(versionColumns(next, memoryVersions.text))
        .from(memoryVersions)
        .innerJoin(newest, eq(newest.version, next.basedOn))
        .where(
          and(
            eq(memoryVersions.projectId, next.projectId),
            eq(memoryVersions.version, text.version),
          ),
        );
    default:
      return text satisfies never;
  }
}

export type { NextMemoryVersion };
export { selectNextMemoryVersion };
