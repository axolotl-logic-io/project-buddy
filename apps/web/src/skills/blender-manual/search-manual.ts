import { desc, type SQL, sql } from "drizzle-orm";
import { getDb } from "@/db/client.ts";
import { manualSections } from "@/db/tables/manual-sections.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";

interface ManualSearchResult {
  // The section's own heading.
  title: string;
  // How a reader tells the section apart from others with the same heading:
  // its page's title, then its heading, such as "Bevel › Options". A page's
  // top section is labelled with its heading alone.
  label: string;
  url: string;
  anchor: string;
  filePath: string;
  text: string;
}

const LABEL_SEPARATOR = " › ";

const pageAlias = sql.identifier("page");

function pageColumn(column: { name: string }): SQL {
  return sql`${pageAlias}.${sql.identifier(column.name)}`;
}

// A page's title is its first heading. The index stores each page's sections
// in document order, so the first heading has the page's smallest id.
// Drizzle leaves column names unqualified in a one-table select, so the
// subquery names its columns itself.
const pageTitle: SQL<string> = sql<string>`(select ${pageColumn(manualSections.title)} from ${manualSections} as ${pageAlias} where ${pageColumn(manualSections.filePath)} = ${manualSections}.${sql.identifier(manualSections.filePath.name)} order by ${pageColumn(manualSections.id)} limit 1)`;

function sectionLabel(pageHeading: string, title: string): string {
  if (pageHeading === title) {
    return title;
  }
  return `${pageHeading}${LABEL_SEPARATOR}${title}`;
}

// Keyword search over the manual index. The query uses web-search syntax:
// words must all match (after English stemming), "quoted phrases" match in
// order, `or` offers alternatives and a leading `-` excludes a word.
async function searchManual(
  query: string,
  limit = 10,
): Promise<ManualSearchResult[]> {
  const tsquery = sql`websearch_to_tsquery('english', ${query})`;
  const rows = await withAppErrors("searchManual", () =>
    getDb()
      .select({
        title: manualSections.title,
        pageTitle,
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
  return rows.map(({ pageTitle: pageHeading, title, ...section }) => ({
    title,
    label: sectionLabel(pageHeading, title),
    ...section,
  }));
}

export type { ManualSearchResult };
export { searchManual };
