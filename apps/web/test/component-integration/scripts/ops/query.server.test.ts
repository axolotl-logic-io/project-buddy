// `npm run ops:query` must only read. Each test runs the real command,
// scripts/ops/query.ts, in its own Node process against a scratch database of
// this test's own, named by a pulled-style env file in a temporary directory.
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { afterAll, beforeAll, expect, test } from "vitest";
import { openPool } from "@/db/client.ts";
import {
  dropTestDatabase,
  resetTestDatabase,
} from "../../../../scripts/test-db/test-database.ts";
import { scratchDatabase } from "../../test-database/scratch-database-test-kit.ts";

const QUERY = "scripts/ops/query.ts";
const RUN_TIMEOUT_MS = 30_000;
// The setting scripts/ops/query.ts reads its env file's directory from.
const OPS_DIR_SETTING = "PROJECT_BUDDY_OPS_DIR";
const database = scratchDatabase("_ops_query");
let opsDir = "";

// One run of the command, as `npm run ops:query -- production "<sql>"`.
interface Run {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

function runQuery(sql: string): Run {
  const run = spawnSync(
    process.execPath,
    [
      "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
      QUERY,
      "production",
      sql,
    ],
    {
      encoding: "utf8",
      env: { ...process.env, [OPS_DIR_SETTING]: opsDir },
      timeout: RUN_TIMEOUT_MS,
    },
  );
  return { status: run.status, stdout: run.stdout, stderr: run.stderr };
}

async function noteCount(): Promise<number> {
  const pool = openPool(database.url);
  try {
    const result = await pool.query("select count(*)::int as n from ops_notes");
    return result.rows[0].n;
  } finally {
    await pool.end();
  }
}

beforeAll(async () => {
  await dropTestDatabase(database);
  await resetTestDatabase(database);
  const pool = openPool(database.url);
  try {
    await pool.query("create table ops_notes (body text)");
    await pool.query("insert into ops_notes values ('kept')");
  } finally {
    await pool.end();
  }
  opsDir = await mkdtemp(join(tmpdir(), "pb-ops-query-"));
  await writeFile(
    join(opsDir, "production.env"),
    `DATABASE_URL_UNPOOLED=${database.url}\n`,
    { mode: 0o600 },
  );
});

afterAll(async () => {
  await rm(opsDir, { recursive: true, force: true });
  await dropTestDatabase(database);
});

test("prints the rows of one statement as JSON", () => {
  const run = runQuery("select body from ops_notes");
  expect(run.stderr).toBe("");
  expect(run.status).toBe(0);
  expect(JSON.parse(run.stdout)).toEqual([{ body: "kept" }]);
});

test.each([
  ["a write", "delete from ops_notes"],
  ["a commit, then a write", "commit; delete from ops_notes"],
  [
    "a read-write transaction",
    "set transaction read write; delete from ops_notes; commit",
  ],
])("refuses %s and changes nothing", async (_name, sql) => {
  const run = runQuery(sql);
  expect(run.status).not.toBe(0);
  expect(await noteCount()).toBe(1);
});

test("refuses a string of several statements, such as one lifting the timeout", () => {
  const run = runQuery("set statement_timeout = 0; select 1");
  expect(run.status).not.toBe(0);
  expect(run.stderr).toContain("cannot insert multiple commands");
});
