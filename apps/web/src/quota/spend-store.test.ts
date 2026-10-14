// @vitest-environment node
import { getTableConfig } from "drizzle-orm/pg-core";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  FAKE_DATABASE_URL,
  type FakeNeonHttp,
  fakeNeonHttp,
  type NeonHttpAnswer,
} from "@/db/fake-neon-http.ts";
import { monthlySpend } from "@/db/tables/monthly-spend.ts";
import { spyOnErrorLog } from "@/errors/error-log-spy.ts";
import { userIdFixture } from "@/id-fixtures.ts";
import { MONTHLY_QUOTA_MICRO_USD } from "@/quota/quota-terms.ts";
import { readMonthlyUsage, recordSpend } from "@/quota/spend-store.ts";

const OWNER = userIdFixture();
// The last millisecond of October 2026 in UTC.
const END_OF_OCTOBER = new Date("2026-10-31T23:59:59.999Z");
const NOVEMBER_FIRST = new Date("2026-11-01T00:00:00Z");
const UPSERT =
  /^insert into "monthly_spend" \("user_id", "month", "micro_usd"\) values \(\$1, \$2, \$3\) on conflict \("user_id","month"\) do update set "micro_usd" = "monthly_spend"\."micro_usd" \+ excluded\.micro_usd$/u;
// The foreign key from a month's spend to its user (drizzle/0005_accounts.sql).
const OWNER_KEY = "monthly_spend_user_id_users_id_fk";
const OWNERS_MONTH =
  /where \("monthly_spend"\."user_id" = \$1 and "monthly_spend"\."month" = \$2\)$/u;

// The database answers every query with these micro_usd values.
function storedSpend(microUsd: readonly string[]): FakeNeonHttp {
  const neonHttp = fakeNeonHttp({
    kind: "rows",
    columns: [{ name: "micro_usd", type: "int4" }],
    rows: microUsd.map((value) => [value]),
  });
  vi.stubGlobal("fetch", neonHttp.fetch);
  return neonHttp;
}

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("recordSpend", () => {
  test("adds the cost to the month's row in one upsert", async () => {
    const cost = 1250;
    const neonHttp = storedSpend([]);

    await recordSpend(OWNER, cost, END_OF_OCTOBER);

    expect(neonHttp.queries).toHaveLength(1);
    expect(neonHttp.queries[0]?.query).toMatch(UPSERT);
    expect(neonHttp.queries[0]?.params).toEqual([
      OWNER,
      "2026-10-01",
      String(cost),
    ]);
  });

  test("counts a call that finishes at midnight UTC in the new month", async () => {
    const neonHttp = storedSpend(["1"]);

    await recordSpend(OWNER, 1, NOVEMBER_FIRST);

    expect(neonHttp.queries[0]?.params).toEqual([OWNER, "2026-11-01", "1"]);
  });
});

// Postgres rejects the upsert with code, naming constraint as the one broken.
function rejectedFor(code: string, constraint: string): FakeNeonHttp {
  const neonHttp = fakeNeonHttp({
    kind: "postgres-error",
    code,
    constraint,
    message: `insert or update on table "monthly_spend" violates ${constraint}`,
  });
  vi.stubGlobal("fetch", neonHttp.fetch);
  return neonHttp;
}

// How many times recordSpend tries an upsert the database is unreachable for.
const ATTEMPTS = 3;
const UNREACHABLE: NeonHttpAnswer = { kind: "unreachable" };
const NO_ROWS: NeonHttpAnswer = {
  kind: "rows",
  columns: [{ name: "micro_usd", type: "int4" }],
  rows: [],
};

// recordSpend's result, with every retry's wait run at once on fake timers.
async function recordSpendWithoutWaiting(): Promise<unknown> {
  vi.useFakeTimers({ toFake: ["setTimeout"] });
  try {
    const recorded = recordSpend(OWNER, 1, NOVEMBER_FIRST).then(
      () => "resolved",
      (error: unknown) => error,
    );
    await vi.runAllTimersAsync();
    return await recorded;
  } finally {
    vi.useRealTimers();
  }
}

describe("recordSpend while the database is unreachable", () => {
  test("tries the same upsert again, unlogged, when the database comes back", async () => {
    const neonHttp = fakeNeonHttp(UNREACHABLE, NO_ROWS);
    vi.stubGlobal("fetch", neonHttp.fetch);
    const log = spyOnErrorLog();

    expect(await recordSpendWithoutWaiting()).toBe("resolved");
    expect(neonHttp.queries).toHaveLength(2);
    expect(neonHttp.queries[1]).toEqual(neonHttp.queries[0]);
    expect(log).not.toHaveBeenCalled();
  });

  test("rejects with one logged AppError after 3 tries when it stays unreachable", async () => {
    const neonHttp = fakeNeonHttp(UNREACHABLE);
    vi.stubGlobal("fetch", neonHttp.fetch);
    const log = spyOnErrorLog();

    expect(await recordSpendWithoutWaiting()).toHaveProperty(
      "errorCase",
      "database-unreachable",
    );
    expect(neonHttp.queries).toHaveLength(ATTEMPTS);
    expect(log).toHaveBeenCalledTimes(1);
  });

  test("doesn't try again when Postgres rejects the query", async () => {
    const neonHttp = fakeNeonHttp(
      {
        kind: "postgres-error",
        code: "42P01",
        message: 'relation "monthly_spend" does not exist',
      },
      NO_ROWS,
    );
    vi.stubGlobal("fetch", neonHttp.fetch);
    spyOnErrorLog();

    expect(await recordSpendWithoutWaiting()).toHaveProperty(
      "errorCase",
      "database-query-failed",
    );
    expect(neonHttp.queries).toHaveLength(1);
  });
});

describe("recordSpend for an owner who no longer exists", () => {
  test("drops the spend, unlogged, when the owner's account is gone", async () => {
    const neonHttp = rejectedFor("23503", OWNER_KEY);
    const log = spyOnErrorLog();

    await expect(
      recordSpend(OWNER, 1, NOVEMBER_FIRST),
    ).resolves.toBeUndefined();
    expect(neonHttp.queries).toHaveLength(1);
    expect(log).not.toHaveBeenCalled();
  });

  test.each([
    ["another foreign key", "23503", "monthly_spend_month_months_fk"],
    ["another constraint on the owner", "23505", OWNER_KEY],
  ])(
    "still rejects with a logged AppError for %s",
    async (_name, code, constraint) => {
      rejectedFor(code, constraint);
      const log = spyOnErrorLog();

      await expect(
        recordSpend(OWNER, 1, NOVEMBER_FIRST),
      ).rejects.toHaveProperty("errorCase", "database-query-failed");
      expect(log).toHaveBeenCalledTimes(1);
    },
  );

  test("knows the table's foreign key to its owner by its name", () => {
    expect(
      getTableConfig(monthlySpend).foreignKeys.map((key) => key.getName()),
    ).toEqual([OWNER_KEY]);
  });
});

describe("readMonthlyUsage", () => {
  test("reads owner's row for the month, with the quota and its reset", async () => {
    const neonHttp = storedSpend(["4990000"]);

    expect(await readMonthlyUsage(OWNER, END_OF_OCTOBER)).toEqual({
      spentMicroUsd: 4_990_000,
      limitMicroUsd: MONTHLY_QUOTA_MICRO_USD,
      resetsOn: NOVEMBER_FIRST,
    });
    expect(neonHttp.queries[0]?.query).toMatch(OWNERS_MONTH);
    expect(neonHttp.queries[0]?.params).toEqual([OWNER, "2026-10-01"]);
  });

  test("is no spend in a month with no row", async () => {
    storedSpend([]);

    expect((await readMonthlyUsage(OWNER, NOVEMBER_FIRST)).spentMicroUsd).toBe(
      0,
    );
  });
});

describe("spend store failures", () => {
  test.each([
    [
      "recordSpend",
      (): Promise<unknown> => recordSpend(OWNER, 1, NOVEMBER_FIRST),
    ],
    [
      "readMonthlyUsage",
      (): Promise<unknown> => readMonthlyUsage(OWNER, NOVEMBER_FIRST),
    ],
  ])(
    "%s rejects with a logged AppError when Postgres rejects the query",
    async (operation, call) => {
      vi.stubGlobal(
        "fetch",
        fakeNeonHttp({
          kind: "postgres-error",
          code: "42P01",
          message: 'relation "monthly_spend" does not exist',
        }).fetch,
      );
      const log = spyOnErrorLog();

      const error = await call().catch((caught: unknown) => caught);

      expect(error).toHaveProperty("errorCase", "database-query-failed");
      expect(log).toHaveBeenCalledWith(
        `[app-error] database-query-failed in ${operation}`,
        expect.any(String),
      );
    },
  );
});
