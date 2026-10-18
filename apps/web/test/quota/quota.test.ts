// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { checkQuota } from "@/quota/quota.ts";
import { MONTHLY_QUOTA_MICRO_USD } from "@/quota/quota-terms.ts";
import {
  FAKE_DATABASE_URL,
  type FakeNeonHttp,
  fakeNeonHttp,
} from "../db/fake-neon-http.ts";
import { spyOnErrorLog } from "../errors/error-log-spy.ts";
import { userIdFixture } from "../id-fixtures.ts";
import { quotaGrantFixture } from "./quota-test-kit.ts";

const OWNER = userIdFixture();
const NOW = new Date("2026-10-31T23:59:59Z");
const NOVEMBER_FIRST = new Date("2026-11-01T00:00:00Z");

// The database holds this month's spend for owner, or with no argument, no
// row.
function spentThisMonth(...microUsd: readonly number[]): FakeNeonHttp {
  const neonHttp = fakeNeonHttp({
    kind: "rows",
    columns: [{ name: "micro_usd", type: "int4" }],
    rows: microUsd.map((value) => [String(value)]),
  });
  vi.stubGlobal("fetch", neonHttp.fetch);
  return neonHttp;
}

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("checkQuota", () => {
  test("reads owner's spend in this month in UTC", async () => {
    const neonHttp = spentThisMonth(0);

    await checkQuota(OWNER);

    expect(neonHttp.queries).toHaveLength(1);
    expect(neonHttp.queries[0]?.query).toContain('from "monthly_spend"');
    expect(neonHttp.queries[0]?.params).toEqual([OWNER, "2026-10-01"]);
  });

  test("is within the quota with no spend this month", async () => {
    spentThisMonth();

    expect(await checkQuota(OWNER)).toEqual({
      kind: "withinQuota",
      grant: quotaGrantFixture(OWNER),
    });
  });

  test("grants owner's model calls when within the quota", async () => {
    spentThisMonth(0);

    const quota = await checkQuota(OWNER);

    expect(quota.kind === "withinQuota" && quota.grant.owner).toBe(OWNER);
  });

  test("is within the quota a micro-USD below it", async () => {
    spentThisMonth(MONTHLY_QUOTA_MICRO_USD - 1);

    expect(await checkQuota(OWNER)).toEqual({
      kind: "withinQuota",
      grant: quotaGrantFixture(OWNER),
    });
  });

  test("is used up at the quota, until midnight UTC on the 1st of next month", async () => {
    spentThisMonth(MONTHLY_QUOTA_MICRO_USD);

    expect(await checkQuota(OWNER)).toEqual({
      kind: "usedUp",
      resetsOn: NOVEMBER_FIRST,
    });
  });

  test("is used up past the quota, as after a reply that crossed it", async () => {
    spentThisMonth(MONTHLY_QUOTA_MICRO_USD + 1);

    expect((await checkQuota(OWNER)).kind).toBe("usedUp");
  });

  test("rejects when the spend can't be read", async () => {
    vi.stubGlobal("fetch", fakeNeonHttp({ kind: "unreachable" }).fetch);
    spyOnErrorLog();

    await expect(checkQuota(OWNER)).rejects.toHaveProperty("errorCase");
  });
});
