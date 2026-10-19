// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { runWithTestDatabase } from "../../../scripts/test-db/run-environment.ts";

const io = vi.hoisted(() => ({
  create: vi.fn<() => Promise<void>>(),
  migrate: vi.fn<() => Promise<void>>(),
  reset: vi.fn<() => Promise<void>>(),
  drop: vi.fn<() => Promise<void>>(),
  recover: vi.fn<() => Promise<void>>(),
  remove: vi.fn<() => Promise<void>>(),
}));
vi.mock("../../../scripts/test-db/test-database.ts", async (original) => ({
  ...(await original()),
  createTestDatabase: io.create,
  migrateTestDatabase: io.migrate,
  resetTestDatabase: io.reset,
}));
vi.mock("../../../scripts/test-db/run-ownership.ts", () => ({
  createRunOwnership: () =>
    Promise.resolve({
      register: vi.fn(),
      reserve: vi.fn(),
      created: vi.fn(),
      remove: io.remove,
    }),
  recoverAbandonedDatabases: io.recover,
  dropRunDatabases: io.drop,
}));
const template = new URL("postgres://localhost:4444/");
template.username = "app";
template.password = "placeholder";
const SERVER: string = template.href;
const PORT = 32_475;
const SOURCES = { freePort: (): Promise<number> => Promise.resolve(PORT) };
const COLLISION = new Error("exclusive allocation collision");
const MIGRATION_FAILURE = new Error("migration failed");
const STOP_FAILURE = new Error("cannot safely stop a known supported process");
beforeEach(() => {
  vi.stubEnv("TUTOR_MODEL", "mock");
  vi.stubEnv("EMAIL_TRANSPORT", "outbox");
  vi.stubEnv("EMAIL_OUTBOX_DIR", "test-results/email-outbox");
});
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});

describe("exclusive generated ownership", () => {
  test("never resets, migrates or drops a colliding database", async () => {
    io.create.mockRejectedValue(COLLISION);
    const command = vi.fn(() => Promise.resolve(0));
    await expect(
      runWithTestDatabase({ databaseUrl: SERVER }, command, SOURCES),
    ).rejects.toBe(COLLISION);
    expect(io.reset).not.toHaveBeenCalled();
    expect(io.migrate).not.toHaveBeenCalled();
    expect(io.drop).not.toHaveBeenCalled();
    expect(command).not.toHaveBeenCalled();
  });
  test("migration failure still drops an exclusively acquired database", async () => {
    io.migrate.mockRejectedValue(MIGRATION_FAILURE);
    const command = vi.fn(() => Promise.resolve(0));
    await expect(
      runWithTestDatabase({ databaseUrl: SERVER }, command, SOURCES),
    ).rejects.toBe(MIGRATION_FAILURE);
    expect(io.drop).toHaveBeenCalledOnce();
    expect(command).not.toHaveBeenCalled();
  });
  test("known supported cleanup failure cannot report success or drop a database still in use", async () => {
    const stop = vi.fn(() => Promise.reject(STOP_FAILURE));
    await expect(
      runWithTestDatabase({ databaseUrl: SERVER }, () => Promise.resolve(0), {
        ...SOURCES,
        stop,
      }),
    ).rejects.toBe(STOP_FAILURE);
    expect(io.drop).not.toHaveBeenCalled();
    expect(io.remove).not.toHaveBeenCalled();
  });
});

const UNSAFE_URLS = [
  SERVER.replace("localhost", "remote.example"),
  `${SERVER}postgres`,
  `${SERVER}invalid-name`,
  `${SERVER}project_buddy_e2e_123_1234abcd`,
  `${SERVER}?host=remote.example`,
];
test.each(UNSAFE_URLS)(
  "unsafe connection refuses all database changes: %s",
  async (databaseUrl) => {
    const command = vi.fn(() => Promise.resolve(0));
    await expect(
      runWithTestDatabase({ databaseUrl }, command, SOURCES),
    ).rejects.toThrow();
    expect(io.create).not.toHaveBeenCalled();
    expect(io.reset).not.toHaveBeenCalled();
    expect(io.migrate).not.toHaveBeenCalled();
    expect(io.drop).not.toHaveBeenCalled();
    expect(io.recover).not.toHaveBeenCalled();
    expect(command).not.toHaveBeenCalled();
  },
);
test.each(["TUTOR_MODEL", "EMAIL_TRANSPORT"])(
  "unsafe %s refuses changes including recovery",
  async (setting) => {
    vi.stubEnv(setting, "unsafe");
    const command = vi.fn(() => Promise.resolve(0));
    await expect(
      runWithTestDatabase({ databaseUrl: SERVER }, command, SOURCES),
    ).rejects.toThrow();
    expect(io.create).not.toHaveBeenCalled();
    expect(io.reset).not.toHaveBeenCalled();
    expect(io.drop).not.toHaveBeenCalled();
    expect(io.recover).not.toHaveBeenCalled();
    expect(command).not.toHaveBeenCalled();
  },
);
