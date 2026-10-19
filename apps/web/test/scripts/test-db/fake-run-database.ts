// Files represent database allocation only. Socket/process lifecycle is real.
import { readdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process, { argv } from "node:process";
import { z } from "zod";
import {
  checkTestDatabase as checkedDatabase,
  checkTestEnvironment as checkedEnvironment,
  checkTestDatabaseServer as checkedServer,
  type TestDatabase,
} from "../../../scripts/test-db/test-database.ts";

function fixtureDirectory(): string {
  const flag = argv.find((argument) => argument.startsWith("--fixture="));
  if (flag === undefined) {
    throw new Error("Fixture directory is required.");
  }
  return flag.slice("--fixture=".length);
}
function createTestDatabase(database: TestDatabase): Promise<void> {
  return writeFile(
    join(fixtureDirectory(), `${database.name}.db`),
    "allocated",
    { flag: "wx" },
  );
}
function migrateTestDatabase(database: TestDatabase): Promise<void> {
  if (argv.includes("--migration-fails")) {
    return Promise.reject(new Error("Controlled migration failure."));
  }
  return writeFile(
    join(fixtureDirectory(), `${database.name}.migrated`),
    "migrated",
  );
}
async function dropTestDatabase(database: TestDatabase): Promise<void> {
  try {
    await unlink(join(fixtureDirectory(), `${database.name}.db`));
  } catch (error) {
    if (
      !(error instanceof Error && "code" in error && error.code === "ENOENT")
    ) {
      throw error;
    }
  }
  await writeFile(
    join(fixtureDirectory(), `${database.name}.dropped`),
    "dropped",
  );
}
async function listServerDatabases(): Promise<readonly string[]> {
  return (await readdir(fixtureDirectory()))
    .filter((name) => name.endsWith(".db"))
    .map((name) => name.slice(0, -".db".length));
}
async function dropUnusedRunDatabases(database: TestDatabase): Promise<void> {
  const names = await listServerDatabases();
  await Promise.all(
    names
      .filter(
        (name) =>
          name === database.name || name.startsWith(`${database.name}_`),
      )
      .map((name) => {
        const url = new URL(database.url);
        url.pathname = `/${name}`;
        return dropTestDatabase(checkTestDatabase(url.href));
      }),
  );
}
async function resetTestDatabase(database: TestDatabase): Promise<void> {
  await dropTestDatabase(database);
  await createTestDatabase(database);
  await migrateTestDatabase(database);
}

async function removeFixtureDirectory(directory: string): Promise<void> {
  const names = (await readdir(directory)).filter(
    (name) =>
      name.startsWith("project_buddy_e2e_") && name.endsWith(".migrated"),
  );
  await Promise.all(
    names.map((name) =>
      rm(
        join(
          tmpdir(),
          `pb-test-runs-${process.getuid?.()}`,
          name.slice(0, -".migrated".length),
        ),
        { force: true, recursive: true },
      ),
    ),
  );
  await rm(directory, { recursive: true });
}

async function ownershipMembers(
  database: string,
): Promise<readonly { readonly pid: number; readonly group: boolean }[]> {
  const path = join(tmpdir(), `pb-test-runs-${process.getuid?.()}`, database);
  const files = (await readdir(path)).filter((file) => file !== "record");
  const schema = z.object({
    pid: z.number().int().positive(),
    group: z.boolean(),
  });
  return Promise.all(
    files.map(async (file) =>
      schema.parse(JSON.parse(await readFile(join(path, file), "utf8"))),
    ),
  );
}

// The substituted module preserves the real safety boundary, not a mock guard.
function checkTestDatabase(url: string): TestDatabase {
  return checkedDatabase(url);
}
function checkTestDatabaseServer(url: string): URL {
  return checkedServer(url);
}
function checkTestEnvironment(url?: string): TestDatabase {
  return checkedEnvironment(url);
}

export {
  checkTestDatabase,
  checkTestDatabaseServer,
  checkTestEnvironment,
  createTestDatabase,
  dropTestDatabase,
  dropUnusedRunDatabases,
  fixtureDirectory,
  listServerDatabases,
  migrateTestDatabase,
  ownershipMembers,
  removeFixtureDirectory,
  resetTestDatabase,
};
