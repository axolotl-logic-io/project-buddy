// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  checkTestDatabase,
  dropTestDatabase,
  migrateTestDatabase,
  resetTestDatabase,
} from "../../../scripts/test-db/test-database.ts";

const fake = vi.hoisted(() => ({
  openPool: vi.fn(),
  query: vi.fn(),
  end: vi.fn<() => Promise<void>>(),
  migrate: vi.fn<() => Promise<void>>(),
}));
vi.mock("../../../src/db/client.ts", () => ({ openPool: fake.openPool }));
vi.mock("drizzle-orm/neon-serverless", () => ({ drizzle: vi.fn() }));
vi.mock("drizzle-orm/neon-serverless/migrator", () => ({
  migrate: fake.migrate,
}));

const url = new URL("postgres://127.0.0.1:4444/pinned");
url.username = "app";
url.password = "placeholder";
const DATABASE = checkTestDatabase(url.href);
const FAILURE = new Error("database operation failed");
const OPERATION_TIMEOUT_MS = 30_000;
const options = {};

beforeEach(() => {
  fake.openPool.mockReturnValue({ options, query: fake.query, end: fake.end });
  fake.end.mockResolvedValue();
  fake.query.mockResolvedValue({ rows: [] });
  fake.migrate.mockResolvedValue();
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("database operations stay inside the validated boundary", () => {
  test("all mutators refuse unsafe routing before a pool exists", async () => {
    const unsafe = { name: "safe", url: `${DATABASE.url}?host=remote.example` };
    await Promise.all(
      [dropTestDatabase, migrateTestDatabase, resetTestDatabase].map(
        (operation) => expect(operation(unsafe)).rejects.toThrow(),
      ),
    );
    expect(fake.openPool).not.toHaveBeenCalled();
  });

  test("uses the validated URL name, never an inconsistent caller name", async () => {
    await dropTestDatabase({ ...DATABASE, name: "another_runs_database" });
    expect(fake.query).toHaveBeenCalledWith(
      "drop database if exists pinned with (force)",
    );
  });

  test("bounds connections and statements before any maintenance query", async () => {
    await dropTestDatabase(DATABASE);
    expect(options).toHaveProperty(
      "connectionTimeoutMillis",
      OPERATION_TIMEOUT_MS,
    );
    expect(options).toHaveProperty("query_timeout", OPERATION_TIMEOUT_MS);
    expect(options).toHaveProperty("statement_timeout", OPERATION_TIMEOUT_MS);
    const maintenanceUrl = new URL(DATABASE.url);
    maintenanceUrl.pathname = "/postgres";
    expect(fake.openPool).toHaveBeenCalledWith(maintenanceUrl.href);
    expect(fake.end).toHaveBeenCalledOnce();
  });
});

describe("reset and query failures", () => {
  test("a failed drop closes its pool without creating or migrating", async () => {
    fake.query.mockRejectedValue(FAILURE);
    await expect(resetTestDatabase(DATABASE)).rejects.toBe(FAILURE);
    expect(fake.query).toHaveBeenCalledExactlyOnceWith(
      "drop database if exists pinned with (force)",
    );
    expect(fake.end).toHaveBeenCalledOnce();
    expect(fake.migrate).not.toHaveBeenCalled();
  });

  test("reset recreates only the supplied database and then migrates it", async () => {
    await resetTestDatabase({ ...DATABASE, name: "untrusted_caller_name" });
    expect(fake.query.mock.calls).toEqual([
      ["drop database if exists pinned with (force)"],
      ["create database pinned"],
    ]);
    expect(fake.migrate).toHaveBeenCalledOnce();
    expect(fake.openPool).toHaveBeenLastCalledWith(DATABASE.url);
    expect(fake.end).toHaveBeenCalledTimes(2);
  });

  test("a migration failure closes its pool with bounds in place", async () => {
    fake.migrate.mockRejectedValue(FAILURE);
    await expect(migrateTestDatabase(DATABASE)).rejects.toBe(FAILURE);
    expect(options).toHaveProperty(
      "connectionTimeoutMillis",
      OPERATION_TIMEOUT_MS,
    );
    expect(options).toHaveProperty("query_timeout", OPERATION_TIMEOUT_MS);
    expect(fake.end).toHaveBeenCalledOnce();
  });
});
