import { drizzle } from "drizzle-orm/neon-serverless";
import { openPool } from "../../db/client.ts";
import { cloneManual } from "./manual-clone.ts";
import { replaceManualSections } from "./manual-index.ts";
import { readManualSections } from "./manual-sections.ts";
import { MANUAL_BRANCH, MANUAL_REPOSITORY_URL } from "./manual-source.ts";

// Rebuilds the manual index in the database at databaseUrl from the release
// branch, reporting progress through `report` one line at a time. This is the
// reindex's composition root: the clone, the Pool and drizzle are built here,
// and scripts/reindex-manual.ts only supplies the URL and prints the report.
export async function reindexManual(
  databaseUrl: string,
  report: (line: string) => void,
): Promise<void> {
  report(`Cloning ${MANUAL_BRANCH} of ${MANUAL_REPOSITORY_URL}`);
  const sections = await readManualSections(await cloneManual());
  const pool = openPool(databaseUrl);
  try {
    await replaceManualSections(drizzle({ client: pool }), sections);
  } finally {
    await pool.end();
  }
  report(`Indexed ${sections.length} manual sections`);
}
