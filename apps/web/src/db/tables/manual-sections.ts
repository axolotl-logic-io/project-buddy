import { sql } from "drizzle-orm";
import { customType, index, integer, pgTable, text } from "drizzle-orm/pg-core";

const tsvector = customType<{ data: string }>({
  dataType: () => "tsvector",
});

// One row per heading of the Blender Reference Manual, rebuilt by
// `npm run manual:reindex`. `search` weights the title above the file path
// (which names the page, such as "edge bevel") and the path above the text.
export const manualSections = pgTable(
  "manual_sections",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    title: text().notNull(),
    text: text().notNull(),
    filePath: text("file_path").notNull(),
    url: text().notNull(),
    anchor: text().notNull(),
    search: tsvector().generatedAlwaysAs(
      sql`setweight(to_tsvector('english', "title"), 'A') || setweight(to_tsvector('english', translate("file_path", '/_.', '   ')), 'B') || setweight(to_tsvector('english', "text"), 'C')`,
    ),
  },
  (table) => [index("manual_sections_search_index").using("gin", table.search)],
);
