import { desc, sql } from "drizzle-orm";
import { getDb } from "@/db/client.ts";
import { manualSections } from "@/db/tables/manual-sections.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";

export interface ManualSearchResult {
  title: string;
  url: string;
  anchor: string;
  filePath: string;
  text: string;
}

// Keyword search over the manual index. The query uses web-search syntax:
// words must all match (after English stemming), "quoted phrases" match in
// order, `or` offers alternatives and a leading `-` excludes a word.
export function searchManual(
  query: string,
  limit = 10,
): Promise<ManualSearchResult[]> {
  const tsquery = sql`websearch_to_tsquery('english', ${query})`;
  return withAppErrors("searchManual", () =>
    getDb()
      .select({
        title: manualSections.title,
        url: manualSections.url,
        anchor: manualSections.anchor,
        filePath: manualSections.filePath,
        text: manualSections.text,
      })
      .from(manualSections)
      .where(sql`${manualSections.search} @@ ${tsquery}`)
      .orderBy(desc(sql`ts_rank(${manualSections.search}, ${tsquery})`))
      .limit(limit),
  );
}
