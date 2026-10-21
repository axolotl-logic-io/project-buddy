// checkQuota against the test database: only this month's spend, in UTC,
// counts toward the quota, so a month used up last month leaves her within
// it now. The clock is fixed mid-month, so no test runs across midnight on
// the 1st.
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { checkQuota } from "@/quota/quota.ts";
import { MONTHLY_QUOTA_MICRO_USD } from "@/quota/quota-terms.ts";
import { recordSpend } from "@/quota/spend-store.ts";
import { testUser } from "../test-database/user-test-kit.ts";

const NOW = new Date("2026-10-14T12:00:00Z");
const LAST_MONTH = new Date("2026-09-30T23:59:59.999Z");

beforeEach(() => {
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
});

afterEach(() => {
  vi.useRealTimers();
});

test("last month's spend doesn't count this month", async () => {
  const user = await testUser();
  await recordSpend(user.id, MONTHLY_QUOTA_MICRO_USD, LAST_MONTH);

  expect((await checkQuota(user.id)).kind).toBe("withinQuota");
});

test("this month's spend counts", async () => {
  const user = await testUser();
  await recordSpend(user.id, MONTHLY_QUOTA_MICRO_USD, NOW);

  expect((await checkQuota(user.id)).kind).toBe("usedUp");
});
