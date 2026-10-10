// @vitest-environment node
import { neon } from "@neondatabase/serverless";
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
import type { Database } from "@/db/client.ts";
import {
  FAKE_DATABASE_URL,
  type FakeNeonHttp,
  fakeNeonHttp,
  type NeonHttpAnswer,
} from "@/db/fake-neon-http.ts";
import { AppError } from "@/errors/app-error.ts";

const NOW = new Date("2026-10-10T12:00:00Z");
const CLIENT_KEY = "203.0.113.7";
const RECORDED_FAILURES = 3;
const WINDOW_START = "2026-10-10T11:55:00Z";

const SELECT_FROM_FAILED_LOGINS = /from "failed_logins"/u;
const INSERT_INTO_FAILED_LOGINS = /insert into "failed_logins"/u;
const UPSERT_ON_CLIENT_KEY = /on conflict \("client_key"\) do update/u;
const INCREMENT_FAILURES = /"failures" \+ 1/u;
const DELETE_FROM_FAILED_LOGINS = /delete from "failed_logins"/u;

const NO_ROWS: NeonHttpAnswer = { kind: "rows", columns: [], rows: [] };

// A database whose Neon endpoint is the fake, answering every query alike.
function databaseAnswering(answer: NeonHttpAnswer): {
  database: Database;
  neonHttp: FakeNeonHttp;
} {
  const neonHttp = fakeNeonHttp(answer);
  vi.stubGlobal("fetch", neonHttp.fetch);
  return {
    database: drizzle({ client: neon(FAKE_DATABASE_URL) }),
    neonHttp,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("isLockedOut", () => {
  test("allows a client with no failed logins", () => {
    expect(isLockedOut(undefined, NOW)).toBe(false);
  });

  test("allows a client below the limit within the window", () => {
    expect(
      isLockedOut(
        { failures: MAX_FAILED_LOGINS - 1, windowStartedAt: NOW },
        NOW,
      ),
    ).toBe(false);
  });

  test("locks out a client at the limit within the window", () => {
    const windowStartedAt = new Date(
      NOW.getTime() - FAILED_LOGIN_WINDOW_MS + 1,
    );

    expect(
      isLockedOut({ failures: MAX_FAILED_LOGINS, windowStartedAt }, NOW),
    ).toBe(true);
  });

  test("allows a client again once the window has passed", () => {
    const windowStartedAt = new Date(NOW.getTime() - FAILED_LOGIN_WINDOW_MS);

    expect(
      isLockedOut({ failures: MAX_FAILED_LOGINS, windowStartedAt }, NOW),
    ).toBe(false);
  });
});

describe("clientKeyFromHeaders", () => {
  test("uses the first address in x-forwarded-for", () => {
    const headers = new Headers({
      "x-forwarded-for": ` ${CLIENT_KEY} , 10.0.0.1`,
    });

    expect(clientKeyFromHeaders(headers)).toBe(CLIENT_KEY);
  });

  test("falls back to a shared key when no address is known", () => {
    expect(clientKeyFromHeaders(new Headers())).toBe("unknown");
  });
});

describe("readFailedLogins", () => {
  test("returns the client's failure count and window start", async () => {
    const { database, neonHttp } = databaseAnswering({
      kind: "rows",
      columns: [
        { name: "failures", type: "int4" },
        { name: "window_started_at", type: "timestamptz" },
      ],
      rows: [[String(RECORDED_FAILURES), WINDOW_START]],
    });

    expect(await readFailedLogins(database, CLIENT_KEY)).toEqual({
      failures: RECORDED_FAILURES,
      windowStartedAt: new Date(WINDOW_START),
    });
    expect(neonHttp.queries[0]?.query).toMatch(SELECT_FROM_FAILED_LOGINS);
    expect(neonHttp.queries[0]?.params).toContain(CLIENT_KEY);
  });

  test("returns undefined for a client with no failures", async () => {
    const { database } = databaseAnswering(NO_ROWS);

    expect(await readFailedLogins(database, CLIENT_KEY)).toBeUndefined();
  });
});

describe("recordFailedLogin", () => {
  test("upserts the client's row, restarting the window once it has passed", async () => {
    const { database, neonHttp } = databaseAnswering(NO_ROWS);

    await recordFailedLogin(database, CLIENT_KEY, NOW);

    const [query] = neonHttp.queries;
    expect(query?.query).toMatch(INSERT_INTO_FAILED_LOGINS);
    expect(query?.query).toMatch(UPSERT_ON_CLIENT_KEY);
    expect(query?.query).toMatch(INCREMENT_FAILURES);
    expect(query?.params).toContain(CLIENT_KEY);
    expect(query?.params).toContain(NOW.toISOString());
    expect(query?.params).toContain(
      new Date(NOW.getTime() - FAILED_LOGIN_WINDOW_MS).toISOString(),
    );
  });
});

describe("clearFailedLogins", () => {
  test("deletes the client's row", async () => {
    const { database, neonHttp } = databaseAnswering(NO_ROWS);

    await clearFailedLogins(database, CLIENT_KEY);

    expect(neonHttp.queries[0]?.query).toMatch(DELETE_FROM_FAILED_LOGINS);
    expect(neonHttp.queries[0]?.params).toEqual([CLIENT_KEY]);
  });
});

describe("failed-login queries when the database is unreachable", () => {
  test.each([
    [
      "readFailedLogins",
      (database: Database): Promise<unknown> =>
        readFailedLogins(database, CLIENT_KEY),
    ],
    [
      "recordFailedLogin",
      (database: Database): Promise<unknown> =>
        recordFailedLogin(database, CLIENT_KEY, NOW),
    ],
    [
      "clearFailedLogins",
      (database: Database): Promise<unknown> =>
        clearFailedLogins(database, CLIENT_KEY),
    ],
  ])("%s rejects with a logged AppError", async (operation, call) => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {
      // The test reads the calls; the output would only be noise.
    });
    const { database } = databaseAnswering({ kind: "unreachable" });

    const error = await call(database).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AppError);
    expect(error).toHaveProperty("errorCase", "database-unreachable");
    expect(log).toHaveBeenCalledWith(
      `[app-error] database-unreachable in ${operation}`,
      expect.any(String),
    );
  });
});
