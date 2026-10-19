// A test run's own database (issue #475): runWithTestDatabase creates it,
// migrates it, drops it when the run's command ends, and drops the
// databases runs that were killed left behind. These tests run inside
// `npm run test:server`'s own run, so each gives runWithTestDatabase the
// server's connection string itself rather than the run's DATABASE_URL.
import { describe, expect, test, vi } from "vitest";
import { openPool } from "@/db/client.ts";
import {
  resolveRunEnvironment,
  runWithTestDatabase,
} from "../../scripts/test-db/run-environment.ts";
import {
  checkTestDatabase,
  checkTestEnvironment,
  dropTestDatabase,
  type TestDatabase,
} from "../../scripts/test-db/test-database.ts";
import { scratchDatabase } from "./scratch-database-test-kit.ts";

// Process 1 always runs, so no real run's cleanup takes a database named
// for it as stale; these tests' runs are told it has ended.
const ENDED_PID = 2_147_483_647;
const FAKE_PORT = 41_003;
const FAILED = 3;
const COMMAND_THREW = /the command threw/u;

type Pool = ReturnType<typeof openPool>;

// The local test server's connection string, with no database name, as
// .env.test.example gives it.
function testServer(): string {
  const url = new URL(checkTestEnvironment().url);
  url.pathname = "";
  return url.href;
}

function fakePort(): Promise<number> {
  return Promise.resolve(FAKE_PORT);
}

// Runs work on the server's own database, from which tests see every
// database and make one.
async function onServer<T>(work: (server: Pool) => Promise<T>): Promise<T> {
  const url = new URL(testServer());
  url.pathname = "/postgres";
  const server = openPool(url.href);
  try {
    return await work(server);
  } finally {
    await server.end();
  }
}

function databaseExists(name: string): Promise<boolean> {
  return onServer(async (server) => {
    const { rows } = await server.query(
      "select 1 from pg_database where datname = $1",
      [name],
    );
    return rows.length === 1;
  });
}

// Whether the database holds the migrated schema.
async function isMigrated(database: TestDatabase): Promise<boolean> {
  const pool = openPool(database.url);
  try {
    const { rows } = await pool.query(
      "select to_regclass('public.users') is not null as migrated",
    );
    return rows.length === 1 && rows[0]?.migrated === true;
  } finally {
    await pool.end();
  }
}

// An empty database named as a run whose process ended would name its own.
async function leftByEndedRun(suffix: string): Promise<TestDatabase> {
  const { database } = await resolveRunEnvironment(
    { databaseUrl: testServer() },
    { pid: ENDED_PID, freePort: fakePort },
  );
  const url = new URL(database.url);
  url.pathname = `/${database.name}${suffix}`;
  const left = checkTestDatabase(url.href);
  await onServer(async (server) => {
    await server.query(`create database ${left.name}`);
  });
  return left;
}

describe("a test run's own database", () => {
  test("is created and migrated for its command, and dropped when it ends", async () => {
    const server = testServer();
    // .env.test's DATABASE_URL names no database: the run picks its own.
    vi.stubEnv("DATABASE_URL", server);
    let during: TestDatabase | undefined;
    let migrated = false;
    try {
      const code = await runWithTestDatabase(
        { databaseUrl: server },
        async ({ database, generated }) => {
          during = database;
          migrated = generated && (await isMigrated(database));
          return 0;
        },
        { freePort: fakePort },
      );

      expect(code).toBe(0);
    } finally {
      vi.unstubAllEnvs();
    }
    expect(migrated).toBe(true);
    expect(during).toBeDefined();
    expect(await databaseExists(during?.name ?? "")).toBe(false);
  });

  test("is dropped when its command fails, and the run fails with it", async () => {
    let during: TestDatabase | undefined;

    const code = await runWithTestDatabase(
      { databaseUrl: testServer() },
      ({ database }) => {
        during = database;
        return Promise.resolve(FAILED);
      },
      { freePort: fakePort },
    );

    expect(code).toBe(FAILED);
    expect(during).toBeDefined();
    expect(await databaseExists(during?.name ?? "")).toBe(false);
  });

  test("is dropped when its command throws", async () => {
    let during: TestDatabase | undefined;

    await expect(
      runWithTestDatabase(
        { databaseUrl: testServer() },
        ({ database }) => {
          during = database;
          return Promise.reject(new Error("the command threw"));
        },
        { freePort: fakePort },
      ),
    ).rejects.toThrow(COMMAND_THREW);
    expect(during).toBeDefined();
    expect(await databaseExists(during?.name ?? "")).toBe(false);
  });
});

describe("a test run's database named explicitly", () => {
  test("is reset, migrated and kept when the run ends", async () => {
    const scratch = scratchDatabase("_kept_by_run");
    const namedUrl = new URL(scratch.url);
    namedUrl.pathname = `/pinned_${scratch.name}`;
    const named = checkTestDatabase(namedUrl.href);
    await dropTestDatabase(named);
    try {
      let generated = true;
      let migrated = false;
      const code = await runWithTestDatabase(
        { databaseUrl: named.url },
        async (environment) => {
          ({ generated } = environment);
          migrated = await isMigrated(environment.database);
          return 0;
        },
        { freePort: fakePort },
      );

      expect(code).toBe(0);
      expect(generated).toBe(false);
      expect(migrated).toBe(true);
      expect(await databaseExists(named.name)).toBe(true);
    } finally {
      await dropTestDatabase(named);
    }
  });
});

describe("a test run's cleanup", () => {
  test("does not infer abandonment merely from a generated name and a missing PID", async () => {
    const left = await leftByEndedRun("");
    const scratchLeft = await leftByEndedRun("_update_manual");
    // The database this server test's own run uses, whose run is alive.
    const inUse = checkTestEnvironment().name;
    try {
      const code = await runWithTestDatabase(
        { databaseUrl: testServer() },
        () => Promise.resolve(0),
        { freePort: fakePort },
      );

      expect(code).toBe(0);
      expect(await databaseExists(left.name)).toBe(true);
      expect(await databaseExists(scratchLeft.name)).toBe(true);
      expect(await databaseExists(inUse)).toBe(true);
    } finally {
      // No real run takes them as stale, since process 1 runs.
      await dropTestDatabase(left);
      await dropTestDatabase(scratchLeft);
    }
  });
});
