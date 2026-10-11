// Writes to the manual index, the table of sections that searchManual
// searches. The reindex replaces the whole index; tests add a few known
// sections beside it. Node runs the reindex directly, so imports here are
// relative.
import { inArray } from "drizzle-orm";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { getDb } from "../db/client.ts";
import { manualSections } from "../db/tables/manual-sections.ts";
import type { ManualSection } from "./manual-sections.ts";

// Rows per INSERT, well under Postgres's limit of 65,535 parameters.
const INSERT_BATCH_SIZE = 1000;

function batchesOf<Item>(items: readonly Item[], size: number): Item[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  );
}

// Inserts the sections and returns their row ids. Inserts on one connection,
// such as a transaction's, queue there, so Postgres runs them in order.
async function insertSections<QueryResult extends PgQueryResultHKT>(
  database: PgDatabase<QueryResult>,
  sections: readonly ManualSection[],
): Promise<number[]> {
  const batches = await Promise.all(
    batchesOf(sections, INSERT_BATCH_SIZE).map((batch) =>
      database
        .insert(manualSections)
        .values(batch)
        .returning({ id: manualSections.id }),
    ),
  );
  return batches.flat().map(({ id }) => id);
}

// Replaces the whole index in one transaction, so searches never see it
// half built.
export async function replaceManualSections(
  database: NeonDatabase,
  sections: readonly ManualSection[],
): Promise<void> {
  await database.transaction(async (transaction) => {
    await transaction.delete(manualSections);
    await insertSections(transaction, sections);
  });
}

// Adds the sections to the index in the app's database, beside the ones it
// holds, and returns a function that removes exactly these sections again.
// For tests that need known sections to search.
export async function addManualSections(
  sections: readonly ManualSection[],
): Promise<() => Promise<void>> {
  const database = getDb();
  const ids = await insertSections(database, sections);
  return async (): Promise<void> => {
    if (ids.length > 0) {
      await database
        .delete(manualSections)
        .where(inArray(manualSections.id, ids));
    }
  };
}
