// @vitest-environment node
import { afterEach, describe, expect, test, vi } from "vitest";
import { checkTestDatabase, checkTestEnvironment } from "./test-database.ts";

// A connection string for the database at host, with placeholder credentials.
function connectionString(host: string, database: string): string {
  const url = new URL(`postgres://${host}/${database}`);
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
const NOT_MOCK = /TUTOR_MODEL is not "mock".*\.env\.test/u;

const LOCAL_DATABASE = connectionString("localhost:4444", "project_buddy_e2e");

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

describe("checkTestDatabase refuses", () => {
  test("a missing or blank DATABASE_URL", () => {
    expect(() => checkTestDatabase(undefined)).toThrow(NOT_SET);
    expect(() => checkTestDatabase("  ")).toThrow(NOT_SET);
  });

  test("a value that is not a URL", () => {
    expect(() => checkTestDatabase("not a url")).toThrow(NOT_A_URL);
  });

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

  test("a database name that SQL would need to quote", () => {
    const url = connectionString("localhost:4444", "Project-Buddy");

    expect(() => checkTestDatabase(url)).toThrow(PLAIN_NAME);
  });
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
