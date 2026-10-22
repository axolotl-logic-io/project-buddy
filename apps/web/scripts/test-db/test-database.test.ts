// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { checkTestDatabase, checkTestEnvironment } from "./test-database.ts";

// A connection string for the database at host, with placeholder credentials.
function connectionString(host: string, database: string): string {
  const url = new URL(`postgres://${host}/${database}`);
  url.username = "app";
  url.password = "placeholder";
  return url.href;
}

// The local test server's connection string with the user and password and
// no database, which test commands must reject.
function serverString(): string {
  const url = new URL("postgres://localhost:4444");
  url.username = "app";
  url.password = "placeholder";
  return url.href;
}

const NOT_SET = /DATABASE_URL is not set.*\.env\.test/u;
const NEON = /a Neon database/u;
const NOT_LOCAL = /not on this machine/u;
const RESERVED = /reserved/u;
const PLAIN_NAME = /lowercase letters, digits and underscores/u;
const NOT_A_URL = /not a connection string/u;
const NO_NAME = /names no database.*test-db:\*.*\.env\.test/u;
const NOT_MOCK = /TUTOR_MODEL is not "mock".*\.env\.test/u;
const NOT_OUTBOX = /EMAIL_TRANSPORT is not "outbox".*\.env\.test/u;
const NO_OUTBOX_DIR = /EMAIL_OUTBOX_DIR is not set.*\.env\.test/u;
const OUTBOX_IN_PRODUCTION = /EMAIL_TRANSPORT is "outbox" in production/u;

const LOCAL_DATABASE = connectionString("localhost:4444", "project_buddy_e2e");
const LOCAL_SERVER = serverString();
const MAX_IDENTIFIER_LENGTH = 63;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("checkTestDatabase accepts", () => {
  test("a database on localhost, by name", () => {
    const url = connectionString("localhost:4444", "project_buddy_e2e");

    expect(checkTestDatabase(url)).toEqual({ url, name: "project_buddy_e2e" });
  });

  test("a database on 127.0.0.1", () => {
    const url = connectionString("127.0.0.1:4444", "lane_two");

    expect(checkTestDatabase(url)).toEqual({ url, name: "lane_two" });
  });
});

describe("lane database names", () => {
  test.each([
    ["pb_lane_1", "127.0.0.1:24001"],
    ["pb_lane_2", "127.0.0.1:24002"],
    ["pb_lane_399", "127.0.0.1:24399"],
  ])(
    "accepts the supplied local database %s",
    (name: string, host: string): void => {
      const url = connectionString(host, name);
      expect(checkTestDatabase(url)).toEqual({ url, name });
    },
  );
});

describe("checkTestDatabase refuses", () => {
  test("a value that is not a URL", () => {
    expect(() => checkTestDatabase("not a url")).toThrow(NOT_A_URL);
    expect(() => checkTestDatabase("")).toThrow(NOT_A_URL);
  });
});

describe("the connection boundary refuses", () => {
  test("a non-Postgres scheme or driver routing override", () => {
    for (const value of [
      "https://localhost:4444/e2e",
      `${LOCAL_DATABASE}?host=remote.example`,
      `${LOCAL_DATABASE}?host=localhost`,
      `${LOCAL_DATABASE}?sslcert=/private/key`,
      `${LOCAL_DATABASE}?options=-c%20search_path=other`,
      `${LOCAL_DATABASE}#ignored`,
    ]) {
      expect(() => checkTestDatabase(value)).toThrow();
    }
  });

  test("an identifier Postgres would truncate into another database", () => {
    const prefix = "a".repeat(MAX_IDENTIFIER_LENGTH);
    expect(() =>
      checkTestDatabase(connectionString("localhost:4444", `${prefix}_other`)),
    ).toThrow();
    expect(
      checkTestDatabase(connectionString("localhost:4444", prefix)).name,
    ).toBe(prefix);
  });

  test("canonicalizes encoded names before driver use and reserved checks", () => {
    expect(
      checkTestDatabase(connectionString("localhost:4444", "%70inned")).name,
    ).toBe("pinned");
    expect(
      checkTestDatabase(connectionString("localhost:4444", "%70inned")).url,
    ).toBe(connectionString("localhost:4444", "pinned"));
    expect(() =>
      checkTestDatabase(connectionString("localhost:4444", "ma%69n")),
    ).toThrow(RESERVED);
  });

  test("duplicate connection options and absent credentials", () => {
    expect(() =>
      checkTestDatabase(`${LOCAL_DATABASE}?sslmode=disable&sslmode=require`),
    ).toThrow();
    expect(() => checkTestDatabase("postgres://localhost:4444/e2e")).toThrow();
  });
});

describe("unsafe databases", () => {
  test("a production-shaped URL from the Neon integration", () => {
    const production = `${connectionString(
      "ep-quiet-pond-123-pooler.eu-west-2.aws.neon.tech",
      "neondb",
    )}?sslmode=require`;

    expect(() => checkTestDatabase(production)).toThrow(NEON);
  });

  test("any other Neon database", () => {
    const branch = connectionString("ep-test-branch.neon.tech", "e2e");

    expect(() => checkTestDatabase(branch)).toThrow(NEON);
  });

  test("a database on another machine", () => {
    const remote = connectionString("db.example.com:5432", "e2e");

    expect(() => checkTestDatabase(remote)).toThrow(NOT_LOCAL);
  });

  test("the server's own databases, which a reset must not drop", () => {
    for (const name of ["postgres", "main", "template0", "template1"]) {
      const url = connectionString("localhost:4444", name);

      expect(() => checkTestDatabase(url)).toThrow(RESERVED);
    }
  });

  test("a server with no database supplied", () => {
    for (const url of [LOCAL_SERVER, `${LOCAL_SERVER}/`]) {
      expect(() => checkTestDatabase(url)).toThrow(NO_NAME);
    }
  });

  test("a database name that SQL would need to quote", () => {
    const url = connectionString("localhost:4444", "Project-Buddy");

    expect(() => checkTestDatabase(url)).toThrow(PLAIN_NAME);
  });
});

// The email settings .env.test.example gives, for each checkTestEnvironment
// test to override.
beforeEach(() => {
  vi.stubEnv("EMAIL_TRANSPORT", "outbox");
  vi.stubEnv("EMAIL_OUTBOX_DIR", "test-results/email-outbox");
});

describe("checkTestEnvironment", () => {
  test("returns the test database when the tutor runs its mock model", () => {
    vi.stubEnv("DATABASE_URL", LOCAL_DATABASE);
    vi.stubEnv("TUTOR_MODEL", "mock");

    expect(checkTestEnvironment()).toEqual({
      url: LOCAL_DATABASE,
      name: "project_buddy_e2e",
    });
  });

  test("checks the database it is given in place of DATABASE_URL's", () => {
    vi.stubEnv("DATABASE_URL", LOCAL_SERVER);
    vi.stubEnv("TUTOR_MODEL", "mock");

    expect(checkTestEnvironment(LOCAL_DATABASE)).toEqual({
      url: LOCAL_DATABASE,
      name: "project_buddy_e2e",
    });
    expect(() =>
      checkTestEnvironment(connectionString("db.example.com", "e2e")),
    ).toThrow(NOT_LOCAL);
  });

  test("refuses to run with DATABASE_URL missing or blank", () => {
    vi.stubEnv("TUTOR_MODEL", "mock");
    vi.stubEnv("DATABASE_URL", undefined);
    expect(() => checkTestEnvironment()).toThrow(NOT_SET);
    vi.stubEnv("DATABASE_URL", "  ");
    expect(() => checkTestEnvironment()).toThrow(NOT_SET);
  });

  test("refuses a database that is not the local test database", () => {
    vi.stubEnv("DATABASE_URL", connectionString("db.example.com", "e2e"));
    vi.stubEnv("TUTOR_MODEL", "mock");

    expect(() => checkTestEnvironment()).toThrow(NOT_LOCAL);
  });

  test("refuses to run with TUTOR_MODEL unset, which means Claude", () => {
    vi.stubEnv("DATABASE_URL", LOCAL_DATABASE);
    vi.stubEnv("TUTOR_MODEL", undefined);

    expect(() => checkTestEnvironment()).toThrow(NOT_MOCK);
  });

  test("refuses to run with the tutor on Claude", () => {
    vi.stubEnv("DATABASE_URL", LOCAL_DATABASE);
    vi.stubEnv("TUTOR_MODEL", "claude");

    expect(() => checkTestEnvironment()).toThrow(NOT_MOCK);
  });
});

describe("checkTestEnvironment's email", () => {
  test("refuses to run unless email goes to the outbox", () => {
    vi.stubEnv("DATABASE_URL", LOCAL_DATABASE);
    vi.stubEnv("TUTOR_MODEL", "mock");
    vi.stubEnv("EMAIL_TRANSPORT", undefined);
    expect(() => checkTestEnvironment()).toThrow(NOT_OUTBOX);
    vi.stubEnv("EMAIL_TRANSPORT", "resend");
    expect(() => checkTestEnvironment()).toThrow(NOT_OUTBOX);
  });

  test("refuses to run without the outbox's folder", () => {
    vi.stubEnv("DATABASE_URL", LOCAL_DATABASE);
    vi.stubEnv("TUTOR_MODEL", "mock");
    vi.stubEnv("EMAIL_OUTBOX_DIR", " ");

    expect(() => checkTestEnvironment()).toThrow(NO_OUTBOX_DIR);
  });

  test("refuses the outbox on a production deployment", () => {
    vi.stubEnv("DATABASE_URL", LOCAL_DATABASE);
    vi.stubEnv("TUTOR_MODEL", "mock");
    vi.stubEnv("VERCEL_ENV", "production");

    expect(() => checkTestEnvironment()).toThrow(OUTBOX_IN_PRODUCTION);
  });
});
