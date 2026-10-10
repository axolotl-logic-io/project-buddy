// @vitest-environment node
import { NeonDbError, type NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  clearFailedLogins,
  clientKeyFromHeaders,
  FAILED_LOGIN_WINDOW_MS,
  isLockedOut,
  MAX_FAILED_LOGINS,
  readFailedLogins,
  recordFailedLogin,
} from "@/auth/failed-logins.ts";
import * as schema from "@/db/schema.ts";
import { AppError } from "@/errors/app-error.ts";

const now = new Date("2026-10-10T12:00:00Z");

// A drizzle client over a fake Neon HTTP function that records each query and
// answers with the given rows, so the queries can be checked without Postgres.
function fakeDb(rows: unknown[][] = []) {
  const queries: { sql: string; params: unknown[] }[] = [];
  const client = async (sql: string, params: unknown[]) => {
    queries.push({ sql, params });
    return { rows, fields: [], rowCount: rows.length, command: "" };
  };
  const db = drizzle({
    client: client as unknown as NeonQueryFunction<false, false>,
    schema,
  });
  return { db, queries };
}

// A drizzle client whose every query fails the way Neon fails when its HTTP
// endpoint cannot be reached.
function unreachableDb() {
  const client = async () => {
    const error = new NeonDbError(
      "Error connecting to database: TypeError: fetch failed",
    );
    error.sourceError = new TypeError("fetch failed");
    throw error;
  };
  return drizzle({
    client: client as unknown as NeonQueryFunction<false, false>,
    schema,
  });
}

describe("isLockedOut", () => {
  test("allows a client with no failed logins", () => {
    expect(isLockedOut(undefined, now)).toBe(false);
  });

  test("allows a client below the limit within the window", () => {
    expect(
      isLockedOut(
        { failures: MAX_FAILED_LOGINS - 1, windowStartedAt: now },
        now,
      ),
    ).toBe(false);
  });

  test("locks out a client at the limit within the window", () => {
    const windowStartedAt = new Date(
      now.getTime() - FAILED_LOGIN_WINDOW_MS + 1,
    );

    expect(
      isLockedOut({ failures: MAX_FAILED_LOGINS, windowStartedAt }, now),
    ).toBe(true);
  });

  test("allows a client again once the window has passed", () => {
    const windowStartedAt = new Date(now.getTime() - FAILED_LOGIN_WINDOW_MS);

    expect(
      isLockedOut({ failures: MAX_FAILED_LOGINS, windowStartedAt }, now),
    ).toBe(false);
  });
});

describe("clientKeyFromHeaders", () => {
  test("uses the first address in x-forwarded-for", () => {
    const headers = new Headers({
      "x-forwarded-for": " 203.0.113.7 , 10.0.0.1",
    });

    expect(clientKeyFromHeaders(headers)).toBe("203.0.113.7");
  });

  test("falls back to a shared key when no address is known", () => {
    expect(clientKeyFromHeaders(new Headers())).toBe("unknown");
  });
});

describe("readFailedLogins", () => {
  test("returns the client's failure count and window start", async () => {
    const { db, queries } = fakeDb([[3, "2026-10-10T11:55:00Z"]]);

    expect(await readFailedLogins(db, "203.0.113.7")).toEqual({
      failures: 3,
      windowStartedAt: new Date("2026-10-10T11:55:00Z"),
    });
    expect(queries[0]?.sql).toMatch(/from "failed_logins"/u);
    expect(queries[0]?.params).toContain("203.0.113.7");
  });

  test("returns undefined for a client with no failures", async () => {
    const { db } = fakeDb([]);

    expect(await readFailedLogins(db, "203.0.113.7")).toBeUndefined();
  });
});

describe("recordFailedLogin", () => {
  test("upserts the client's row, restarting the window once it has passed", async () => {
    const { db, queries } = fakeDb();

    await recordFailedLogin(db, "203.0.113.7", now);

    const [query] = queries;
    expect(query?.sql).toMatch(/insert into "failed_logins"/u);
    expect(query?.sql).toMatch(/on conflict \("client_key"\) do update/u);
    expect(query?.sql).toMatch(/"failures" \+ 1/u);
    expect(query?.params).toContain("203.0.113.7");
    expect(query?.params).toContain(now.toISOString());
    expect(query?.params).toContain(
      new Date(now.getTime() - FAILED_LOGIN_WINDOW_MS).toISOString(),
    );
  });
});

describe("clearFailedLogins", () => {
  test("deletes the client's row", async () => {
    const { db, queries } = fakeDb();

    await clearFailedLogins(db, "203.0.113.7");

    expect(queries[0]?.sql).toMatch(/delete from "failed_logins"/u);
    expect(queries[0]?.params).toEqual(["203.0.113.7"]);
  });
});

describe("failed-login queries when the database is unreachable", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test.each([
    ["readFailedLogins", () => readFailedLogins(unreachableDb(), "a")],
    ["recordFailedLogin", () => recordFailedLogin(unreachableDb(), "a", now)],
    ["clearFailedLogins", () => clearFailedLogins(unreachableDb(), "a")],
  ])("%s rejects with a logged AppError", async (operation, call) => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const error = await call().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).errorCase).toBe("database-unreachable");
    expect(log).toHaveBeenCalledWith(
      `[app-error] database-unreachable in ${operation}`,
      expect.any(String),
    );
  });
});
