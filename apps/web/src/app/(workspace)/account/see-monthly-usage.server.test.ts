// "use_case_see_monthly_usage" in use-cases/accounts.md: her account page
// states this month's spend out of the $5 quota, and the day it resets. The
// page reads the usage and states it as usage-amounts.ts does; the meter and
// the sign-out buttons are checked in usage-meter.test.tsx and
// layout.test.tsx.
import { expect, test, vi } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { formatResetDay } from "@/quota/quota-terms.ts";
import { resetDaysSince, spend } from "@/quota/reset-days-test-kit.ts";
import { readMonthlyUsage } from "@/quota/spend-store.ts";
import { testData } from "@/test-database/data-test-kit.ts";
import { signIn } from "@/test-database/session-test-kit.ts";
import { testUser } from "@/test-database/user-test-kit.ts";
import { sendChatMessage } from "@/tutor/tutor-chat-test-kit.ts";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { usageAmounts } from "./usage-amounts.ts";

vi.mock("next/server", () => import("@/tutor/after-tasks-test-kit.ts"));

const DOLLAR_AND_A_QUARTER = 1_250_000;
const MESSAGE = "Bevel a donut";

// What her account page states: her spend out of the quota, and the day it
// resets.
interface StatedUsage {
  readonly usage: string;
  readonly resetDay: string;
}

// Her usage as the account page reads and states it.
async function statedUsage(user: User): Promise<StatedUsage> {
  const usage = await readMonthlyUsage(user.id, new Date());
  const { spent, limit } = usageAmounts(usage);
  return {
    usage: ACCOUNT_COPY.usage(spent, limit),
    resetDay: formatResetDay(usage.resetsOn),
  };
}

test("use_case_see_monthly_usage", async () => {
  const user = await testUser();
  const data = testData(user);
  const chat = await data.chat(await data.project());
  const since = new Date();
  await spend(user, DOLLAR_AND_A_QUARTER);

  const before = await statedUsage(user);

  expect(before.usage).toBe("$1.25 of $5.00");
  expect(resetDaysSince(since)).toContain(before.resetDay);

  await signIn(user);
  const { status } = await sendChatMessage(chat.id, MESSAGE);

  expect(status).toBe(HTTP_STATUS.ok);
  const after = await statedUsage(user);
  // A reply from the mock tutor costs a fraction of a cent, which the page
  // rounds up.
  expect(after.usage).toBe("$1.26 of $5.00");
  expect(resetDaysSince(since)).toContain(after.resetDay);
});
