// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  checkTestDatabase,
  createTestDatabase,
  dropTestDatabase,
  listServerDatabases,
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
      [
        createTestDatabase,
        dropTestDatabase,
        migrateTestDatabase,
        resetTestDatabase,
        listServerDatabases,
      ].map((operation) => expect(operation(unsafe)).rejects.toThrow()),
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
    await listServerDatabases(DATABASE);
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

describe("allocation and query failures", () => {
  test("a generated-name collision cannot drop the pre-existing database", async () => {
    fake.query.mockRejectedValue(FAILURE);
    await expect(createTestDatabase(DATABASE)).rejects.toBe(FAILURE);
    expect(fake.query).toHaveBeenCalledExactlyOnceWith(
      "create database pinned",
    );
    expect(fake.end).toHaveBeenCalledOnce();
    expect(fake.migrate).not.toHaveBeenCalled();
  });

  test("malformed catalog data still closes the maintenance connection", async () => {
    fake.query.mockResolvedValue({ rows: [{ datname: 123 }] });
    await expect(listServerDatabases(DATABASE)).rejects.toThrow();
    expect(fake.end).toHaveBeenCalledOnce();
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
