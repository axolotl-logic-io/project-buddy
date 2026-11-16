import { resolve } from "node:path";
import { describe, expect, it as test } from "vitest";
import { localDevelopmentDatabase } from "../../../../scripts/development/database.ts";
import { developmentDatabaseUrl } from "../../../../scripts/development/environment.ts";

const own = developmentDatabaseUrl(resolve("."));
const REFUSAL = "not this worktree's local development database";
const OWN_NAME = /^pb_dev_[\da-f]{12}$/u;
const DEVELOPMENT_PORT = 5434;
const TEST_PORT = 5433;
const POSTGRES_PORT = 5432;

// A connection string with the local servers' user and password.
function serverUrl(host: string, port: number, database: string): string {
  const url = new URL(`postgres://${host}:${port}/${database}`);
  url.username = "postgres";
  url.password = "postgres";
  return url.href;
}

describe("the development database setup makes, migrates and resets", () => {
  test("is this worktree's own database on the local development server", () => {
    expect(localDevelopmentDatabase(own).url).toBe(own);
    expect(localDevelopmentDatabase(own).name).toMatch(OWN_NAME);
  });

  test.each([
    ["no database", undefined],
    [
      "the shared database",
      serverUrl("127.0.0.1", DEVELOPMENT_PORT, "project_buddy_dev"),
    ],
    ["another worktree's", developmentDatabaseUrl("/elsewhere/apps/web")],
    ["a test database", serverUrl("127.0.0.1", TEST_PORT, "project_buddy_e2e")],
    ["the same name on the test server", own.replace(":5434/", ":5433/")],
    ["the same name on another host", own.replace("127.0.0.1", "db.example")],
    ["a hosted database", serverUrl("ep-x.neon.tech", POSTGRES_PORT, "neondb")],
  ])("is never %s", (_case, url) => {
    expect(() => localDevelopmentDatabase(url)).toThrow(REFUSAL);
  });
});
