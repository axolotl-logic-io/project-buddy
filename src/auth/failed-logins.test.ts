// @vitest-environment node
import { NeonDbError, type NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearFailedLogins,
  clientKeyFromHeaders,
  FAILED_LOGIN_WINDOW_MS,
  isLockedOut,
  MAX_FAILED_LOGINS,
  readFailedLogins,
  recordFailedLogin,
} from "@/auth/failed-logins";
import * as schema from "@/db/schema";
import { AppError } from "@/errors/app-error";

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
  it("allows a client with no failed logins", () => {
    expect(isLockedOut(undefined, now)).toBe(false);
  });

  it("allows a client below the limit within the window", () => {
    expect(
      isLockedOut(
        { failures: MAX_FAILED_LOGINS - 1, windowStartedAt: now },
        now,
      ),
    ).toBe(false);
  });

  it("locks out a client at the limit within the window", () => {
    const windowStartedAt = new Date(
      now.getTime() - FAILED_LOGIN_WINDOW_MS + 1,
    );

    expect(
      isLockedOut({ failures: MAX_FAILED_LOGINS, windowStartedAt }, now),
    ).toBe(true);
  });

  it("allows a client again once the window has passed", () => {
    const windowStartedAt = new Date(now.getTime() - FAILED_LOGIN_WINDOW_MS);

    expect(
      isLockedOut({ failures: MAX_FAILED_LOGINS, windowStartedAt }, now),
    ).toBe(false);
  });
});

describe("clientKeyFromHeaders", () => {
  it("uses the first address in x-forwarded-for", () => {
    const headers = new Headers({
      "x-forwarded-for": " 203.0.113.7 , 10.0.0.1",
    });

    expect(clientKeyFromHeaders(headers)).toBe("203.0.113.7");
  });

  it("falls back to a shared key when no address is known", () => {
    expect(clientKeyFromHeaders(new Headers())).toBe("unknown");
  });
});

describe("readFailedLogins", () => {
  it("returns the client's failure count and window start", async () => {
    const { db, queries } = fakeDb([[3, "2026-10-10T11:55:00Z"]]);

    expect(await readFailedLogins(db, "203.0.113.7")).toEqual({
      failures: 3,
      windowStartedAt: new Date("2026-10-10T11:55:00Z"),
    });
    expect(queries[0].sql).toMatch(/from "failed_logins"/);
    expect(queries[0].params).toContain("203.0.113.7");
  });

  it("returns undefined for a client with no failures", async () => {
    const { db } = fakeDb([]);

    expect(await readFailedLogins(db, "203.0.113.7")).toBeUndefined();
  });
});

describe("recordFailedLogin", () => {
  it("upserts the client's row, restarting the window once it has passed", async () => {
    const { db, queries } = fakeDb();

    await recordFailedLogin(db, "203.0.113.7", now);

    const [{ sql, params }] = queries;
    expect(sql).toMatch(/insert into "failed_logins"/);
    expect(sql).toMatch(/on conflict \("client_key"\) do update/);
    expect(sql).toMatch(/"failures" \+ 1/);
    expect(params).toContain("203.0.113.7");
    expect(params).toContain(now.toISOString());
    expect(params).toContain(
      new Date(now.getTime() - FAILED_LOGIN_WINDOW_MS).toISOString(),
    );
  });
});

describe("clearFailedLogins", () => {
  it("deletes the client's row", async () => {
    const { db, queries } = fakeDb();

    await clearFailedLogins(db, "203.0.113.7");

    expect(queries[0].sql).toMatch(/delete from "failed_logins"/);
    expect(queries[0].params).toEqual(["203.0.113.7"]);
  });
});

describe("failed-login queries when the database is unreachable", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
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
