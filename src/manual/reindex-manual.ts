import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { manualSections } from "../db/tables/manual-sections.ts";
import { readDatabaseUrl } from "../env.ts";
import { withManualCheckout } from "./manual-checkout.ts";
import { type ManualSection, readManualSections } from "./manual-sections.ts";
import { MANUAL_BRANCH, MANUAL_REPOSITORY_URL } from "./manual-source.ts";

// The parts of drizzle's insert builder that replaceManualSections uses.
interface ManualSectionInsert {
  values(rows: ManualSection[]): PromiseLike<unknown>;
}

// The parts of a drizzle transaction that replaceManualSections uses.
interface ManualSectionTransaction {
  delete(table: typeof manualSections): PromiseLike<unknown>;
  insert(table: typeof manualSections): ManualSectionInsert;
}

// The part of a drizzle database that replaceManualSections uses.
interface ManualSectionStore {
  transaction(
    run: (transaction: ManualSectionTransaction) => Promise<void>,
  ): Promise<void>;
}

// Rows per INSERT, well under Postgres's limit of 65,535 parameters.
const INSERT_BATCH_SIZE = 1000;

function batchesOf<Item>(items: readonly Item[], size: number): Item[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  );
}

export type {
  ManualSectionInsert,
  ManualSectionStore,
  ManualSectionTransaction,
};

// Replaces the whole index in one transaction, so searches never see it
// half built. The inserts queue on the transaction's one connection, so
// Postgres runs them in order.
export async function replaceManualSections(
  store: ManualSectionStore,
  sections: ManualSection[],
): Promise<void> {
  await store.transaction(async (transaction) => {
    await transaction.delete(manualSections);
    await Promise.all(
      batchesOf(sections, INSERT_BATCH_SIZE).map((batch) =>
        transaction.insert(manualSections).values(batch),
      ),
    );
  });
}

// Rebuilds the manual index from the release branch, reporting progress
// through `report` one line at a time.
export async function reindexManual(
  report: (line: string) => void,
): Promise<void> {
  const databaseUrl = readDatabaseUrl();
  report(`Cloning ${MANUAL_BRANCH} of ${MANUAL_REPOSITORY_URL}`);
  const sections = await withManualCheckout(readManualSections);
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    await replaceManualSections(drizzle({ client: pool }), sections);
  } finally {
    await pool.end();
  }
  report(`Indexed ${sections.length} manual sections`);
}
