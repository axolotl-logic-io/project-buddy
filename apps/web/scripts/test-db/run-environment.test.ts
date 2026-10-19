// @vitest-environment node
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  type RunEnvironment,
  resolveRunEnvironment,
  runWithTestDatabase,
} from "./run-environment.ts";
import { checkTestDatabase } from "./test-database.ts";

// A connection string for the server at host, with placeholder credentials,
// naming database, or no database when it is empty.
function connectionString(host: string, database: string): string {
  const url = new URL(`postgres://${host}`);
  url.username = "app";
  url.password = "placeholder";
  if (database !== "") {
    url.pathname = `/${database}`;
  }
  return url.href;
}

// The local test server as .env.test.example gives it: a user and password,
// and no database name.
const SERVER = connectionString("localhost:4444", "");
const NAMED = connectionString("localhost:4444", "project_buddy_e2e");
const REMOTE = connectionString("db.example.com:5432", "");
const NEON_SERVER = connectionString("ep-quiet-pond-123.neon.tech", "");

const FIRST_PID = 4101;
const SECOND_PID = 4102;
const FIRST_PORT = 41_001;
const SECOND_PORT = 41_002;
const CHOSEN_PORT = 3200;
// The largest process id any system hands out, so the longest name a run
// can generate.
const LARGEST_PID = 2_147_483_647;
// Postgres's identifier limit is 63; a generated name leaves room for a
// scratch database's suffix (src/test-database/scratch-database-test-kit.ts).
const LONGEST_GENERATED_NAME = 40;
// Process 1 always runs, and no run's process is it.

const PINNED_GENERATED = /generated-run name/u;
const NOT_LOCAL = /not on this machine/u;
const NEON = /a Neon database/u;
const NOT_MOCK = /TUTOR_MODEL is not "mock".*\.env\.test/u;

function fixedPort(port: number): () => Promise<number> {
  return () => Promise.resolve(port);
}

function noFreePort(): Promise<number> {
  return Promise.reject(new Error("the run asked for a free port"));
}

// A run's environment on SERVER, for the run whose process is pid.
function generatedFor(pid: number): Promise<RunEnvironment> {
  return resolveRunEnvironment(
    { databaseUrl: SERVER },
    { pid, freePort: fixedPort(FIRST_PORT) },
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("a run's own database and port", () => {
  test("two runs in one checkout get different databases", async () => {
    const first = await generatedFor(FIRST_PID);
    const second = await generatedFor(FIRST_PID);

    expect(first.database.name).not.toBe(second.database.name);
  });

  test("runs in two checkouts get different databases and ports", async () => {
    const first = await resolveRunEnvironment(
      { databaseUrl: SERVER },
      { pid: FIRST_PID, freePort: fixedPort(FIRST_PORT) },
    );
    const second = await resolveRunEnvironment(
      { databaseUrl: SERVER },
      { pid: SECOND_PID, freePort: fixedPort(SECOND_PORT) },
    );

    expect(first.database.name).not.toBe(second.database.name);
    expect([first.port, second.port]).toEqual([FIRST_PORT, SECOND_PORT]);
  });

  test("is a generated database on the server and user .env.test gives", async () => {
    const { database, generated } = await generatedFor(FIRST_PID);
    const url = new URL(database.url);
    const server = new URL(SERVER);

    expect(generated).toBe(true);
    expect(url.host).toBe(server.host);
    expect(url.username).toBe(server.username);
    expect(url.password).toBe(server.password);
    expect(checkTestDatabase(database.url)).toEqual(database);
  });

  test("is generated when DATABASE_URL's path names no database", async () => {
    const { database, generated } = await resolveRunEnvironment(
      { databaseUrl: `${SERVER}/` },
      { pid: FIRST_PID, freePort: fixedPort(FIRST_PORT) },
    );

    expect(generated).toBe(true);
    expect(checkTestDatabase(database.url)).toEqual(database);
  });

  test("has a name short enough for a scratch database beside it", async () => {
    const { database } = await generatedFor(LARGEST_PID);

    expect(database.name.length).toBeLessThanOrEqual(LONGEST_GENERATED_NAME);
  });
});

describe("a run's database or port set explicitly", () => {
  test("uses a database name set explicitly as given, and keeps it", async () => {
    const environment = await resolveRunEnvironment(
      { databaseUrl: NAMED },
      { pid: FIRST_PID, freePort: fixedPort(FIRST_PORT) },
    );

    expect(environment.database).toEqual({
      url: NAMED,
      name: "project_buddy_e2e",
    });
    expect(environment.generated).toBe(false);
  });

  test("refuses a pinned name reserved for generated cleanup", async () => {
    const { database } = await generatedFor(FIRST_PID);
    await expect(
      resolveRunEnvironment(
        { databaseUrl: database.url },
        { freePort: noFreePort },
      ),
    ).rejects.toThrow(PINNED_GENERATED);
  });

  test("uses a port set explicitly as given", async () => {
    const environment = await resolveRunEnvironment(
      { databaseUrl: SERVER, port: CHOSEN_PORT },
      { pid: FIRST_PID, freePort: noFreePort },
    );

    expect(environment.port).toBe(CHOSEN_PORT);
  });
});

describe("a run's server", () => {
  test("refuses a server that is not on this machine", async () => {
    await expect(
      resolveRunEnvironment({ databaseUrl: REMOTE }, { pid: FIRST_PID }),
    ).rejects.toThrow(NOT_LOCAL);
    await expect(
      resolveRunEnvironment({ databaseUrl: NEON_SERVER }, { pid: FIRST_PID }),
    ).rejects.toThrow(NEON);
  });
});

describe("a run refuses, before it runs its command,", () => {
  // The email settings .env.test.example gives.
  function stubTestEmail(): void {
    vi.stubEnv("EMAIL_TRANSPORT", "outbox");
    vi.stubEnv("EMAIL_OUTBOX_DIR", "test-results/email-outbox");
  }

  test("a server that is not on this machine", async () => {
    stubTestEmail();
    vi.stubEnv("TUTOR_MODEL", "mock");
    const command = vi.fn(() => Promise.resolve(0));

    await expect(
      runWithTestDatabase({ databaseUrl: REMOTE }, command, {
        freePort: fixedPort(FIRST_PORT),
      }),
    ).rejects.toThrow(NOT_LOCAL);
    expect(command).not.toHaveBeenCalled();
  });

  test("a run whose tutor would call Claude", async () => {
    stubTestEmail();
    // .env.test's DATABASE_URL names no database: the run picks its own.
    vi.stubEnv("DATABASE_URL", SERVER);
    vi.stubEnv("TUTOR_MODEL", "claude");
    const command = vi.fn(() => Promise.resolve(0));

    await expect(
      runWithTestDatabase({ databaseUrl: SERVER }, command, {
        freePort: fixedPort(FIRST_PORT),
      }),
    ).rejects.toThrow(NOT_MOCK);
    expect(command).not.toHaveBeenCalled();
  });
});
