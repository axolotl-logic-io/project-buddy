// A copy of the migrations folder that stops at an earlier migration, so a
// test can build a database as an older release left it, then migrate it to
// the current schema. The migrator reads only the .sql files and the
// journal, so the copy keeps every file and drops the later journal entries.
// One of the files that may use Node's file system (biome.jsonc). Node runs
// this file directly, so its imports are relative.
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

const MIGRATIONS_FOLDER = "./drizzle";

// The fields of drizzle/meta/_journal.json this module reads; the rest are
// kept as they are.
const JOURNAL = z.looseObject({
  entries: z.array(z.looseObject({ idx: z.number() })),
});

// Copies drizzle/ to a new temporary folder whose journal ends at the entry
// with index lastIndex, and returns that folder's path. Remove it with
// removeOldMigrations.
export async function copyMigrationsUpTo(lastIndex: number): Promise<string> {
  const folder = await mkdtemp(join(tmpdir(), "old-migrations-"));
  await cp(MIGRATIONS_FOLDER, folder, { recursive: true });
  const journalPath = join(folder, "meta", "_journal.json");
  const journal = JOURNAL.parse(
    JSON.parse(await readFile(journalPath, "utf8")),
  );
  const entries = journal.entries.filter((entry) => entry.idx <= lastIndex);
  await writeFile(journalPath, JSON.stringify({ ...journal, entries }));
  return folder;
}

// Removes a folder copyMigrationsUpTo made.
export async function removeOldMigrations(folder: string): Promise<void> {
  await rm(folder, { recursive: true, force: true });
}
