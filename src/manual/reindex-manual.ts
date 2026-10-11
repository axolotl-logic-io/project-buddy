import { Pool } from "@neondatabase/serverless";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import { manualSections } from "../db/tables/manual-sections.ts";
import { cloneManual } from "./manual-clone.ts";
import { type ManualSection, readManualSections } from "./manual-sections.ts";
import { MANUAL_BRANCH, MANUAL_REPOSITORY_URL } from "./manual-source.ts";

// Rows per INSERT, well under Postgres's limit of 65,535 parameters.
const INSERT_BATCH_SIZE = 1000;

function batchesOf<Item>(items: readonly Item[], size: number): Item[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  );
}

// Replaces the whole index in one transaction, so searches never see it
// half built. The inserts queue on the transaction's one connection, so
// Postgres runs them in order.
async function replaceManualSections(
  database: NeonDatabase,
  sections: readonly ManualSection[],
): Promise<void> {
  await database.transaction(async (transaction) => {
    await transaction.delete(manualSections);
    await Promise.all(
      batchesOf(sections, INSERT_BATCH_SIZE).map((batch) =>
        transaction.insert(manualSections).values(batch),
      ),
    );
  });
}

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
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    await replaceManualSections(drizzle({ client: pool }), sections);
  } finally {
    await pool.end();
  }
  report(`Indexed ${sections.length} manual sections`);
}
