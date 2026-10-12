// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  FAKE_DATABASE_URL,
  type FakeNeonHttp,
  fakeNeonHttp,
} from "@/db/fake-neon-http.ts";
import { spyOnErrorLog } from "@/errors/error-log-spy.ts";
import { userIdFixture } from "@/id-fixtures.ts";
import { MONTHLY_QUOTA_MICRO_USD } from "@/quota/quota-terms.ts";
import { readMonthlyUsage, recordSpend } from "@/quota/spend-store.ts";

const OWNER = userIdFixture();
// The last millisecond of October 2026 in UTC.
const END_OF_OCTOBER = new Date("2026-10-31T23:59:59.999Z");
const NOVEMBER_FIRST = new Date("2026-11-01T00:00:00Z");
const UPSERT =
  /^insert into "monthly_spend" \("user_id", "month", "micro_usd"\) values \(\$1, \$2, \$3\) on conflict \("user_id","month"\) do update set "micro_usd" = "monthly_spend"\."micro_usd" \+ excluded\.micro_usd returning "micro_usd"$/u;
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
  test("adds the cost to the month's row in one upsert and returns the month's spend", async () => {
    const cost = 1250;
    const spentAfter = 4250;
    const neonHttp = storedSpend([String(spentAfter)]);

    expect(await recordSpend(OWNER, cost, END_OF_OCTOBER)).toBe(spentAfter);
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
