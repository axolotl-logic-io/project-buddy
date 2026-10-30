// The spend store against the test database: a call is counted in the UTC
// month it finishes in, and the spend of an account that has since been
// deleted is dropped without a logged error.
import { expect, test } from "vitest";
import { readMonthlyUsage, recordSpend } from "@/quota/spend-store.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { spyOnErrorLog } from "../errors/error-log-spy.ts";
import {
  deleteAccount,
  twoUsers,
} from "../test-database/two-users-test-kit.ts";

// The last millisecond of October 2026 in UTC, and the next.
const END_OF_OCTOBER = new Date("2026-10-31T23:59:59.999Z");
const NOVEMBER_FIRST = new Date("2026-11-01T00:00:00Z");
const COST_MICRO_USD = 1250;

test("a call that finishes at midnight UTC counts in the new month", async () => {
  const user = await testUser();

  await recordSpend(user.id, COST_MICRO_USD, NOVEMBER_FIRST);

  expect((await readMonthlyUsage(user.id, END_OF_OCTOBER)).spentMicroUsd).toBe(
    0,
  );
  expect((await readMonthlyUsage(user.id, NOVEMBER_FIRST)).spentMicroUsd).toBe(
    COST_MICRO_USD,
  );
});

test("the spend of a deleted account is dropped, unlogged", async () => {
  const { other } = await twoUsers();
  await deleteAccount(other);
  const log = spyOnErrorLog();

  await expect(
    recordSpend(other.id, COST_MICRO_USD, NOVEMBER_FIRST),
  ).resolves.toBeUndefined();
  expect(log).not.toHaveBeenCalled();
});
