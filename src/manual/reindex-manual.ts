import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Pool } from "@neondatabase/serverless";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import { readDatabaseUrl } from "../db/database-url.ts";
import { manualSections } from "../db/tables/manual-sections.ts";
import { type ManualSection, readManualSections } from "./manual-sections.ts";
import { MANUAL_BRANCH, MANUAL_REPOSITORY_URL } from "./manual-source.ts";

export type ManualDatabase = NeonDatabase;

const INSERT_BATCH_SIZE = 1000;

// A shallow clone of the release branch only. Plain git over HTTPS works even
// though the projects.blender.org web pages sit behind a bot challenge.
export function cloneManual(
  targetDir: string,
  repositoryUrl = MANUAL_REPOSITORY_URL,
): void {
  execFileSync(
    "git",
    [
      "clone",
      "--quiet",
      "--depth=1",
      `--branch=${MANUAL_BRANCH}`,
      repositoryUrl,
      targetDir,
    ],
    { stdio: "inherit" },
  );
}

// Replaces the whole index in one transaction, so searches never see it
// half built.
export async function replaceManualSections(
  database: ManualDatabase,
  sections: ManualSection[],
): Promise<void> {
  await database.transaction(async (transaction) => {
    await transaction.delete(manualSections);
    for (let start = 0; start < sections.length; start += INSERT_BATCH_SIZE) {
      await transaction
        .insert(manualSections)
        .values(sections.slice(start, start + INSERT_BATCH_SIZE));
    }
  });
}

export async function reindexManual(): Promise<void> {
  const databaseUrl = readDatabaseUrl();
  const repositoryDir = await mkdtemp(join(tmpdir(), "blender-manual-"));
  try {
    console.log(`Cloning ${MANUAL_BRANCH} of ${MANUAL_REPOSITORY_URL}`);
    cloneManual(repositoryDir);
    const sections = await readManualSections(repositoryDir);
    const pool = new Pool({ connectionString: databaseUrl });
    try {
      await replaceManualSections(drizzle({ client: pool }), sections);
    } finally {
      await pool.end();
    }
    console.log(`Indexed ${sections.length} manual sections`);
  } finally {
    await rm(repositoryDir, { recursive: true, force: true });
  }
}
