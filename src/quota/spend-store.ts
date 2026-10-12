// What each user's Claude calls cost per calendar month (UTC), stored in
// Postgres's monthly_spend: added to after every model call (spend-meter.ts)
// and read before each message, new chat and new project (quota.ts) and on
// the account page.
import { and, eq, sql } from "drizzle-orm";
import { monthlySpendOwnedBy } from "@/accounts/owner-scope.ts";
import { getDb } from "@/db/client.ts";
import { monthlySpend } from "@/db/tables/monthly-spend.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import type { UserId } from "@/ids.ts";
import {
  MONTHLY_QUOTA_MICRO_USD,
  quotaResetsOn,
  spendMonthOf,
} from "@/quota/quota-terms.ts";

// A user's spend in the month of a moment, against the quota.
interface MonthlyUsage {
  // In micro-USD.
  readonly spentMicroUsd: number;
  readonly limitMicroUsd: number;
  // Midnight UTC at the start of the next month's first day.
  readonly resetsOn: Date;
}

// Adds microUsd to owner's spend in the month of now, in one statement, so
// calls that finish together each add their own cost. Returns the month's
// spend after the addition.
function recordSpend(
  owner: UserId,
  microUsd: number,
  now: Date,
): Promise<number> {
  return withAppErrors("recordSpend", async () => {
    // The row it writes or adds to has user_id owner, by the insert's values
    // and the (user_id, month) key it conflicts on, so it needs no
    // ownership predicate (src/accounts/owner-scope.ts).
    const [row] = await getDb()
      .insert(monthlySpend)
      .values({ userId: owner, month: spendMonthOf(now), microUsd })
      .onConflictDoUpdate({
        target: [monthlySpend.userId, monthlySpend.month],
        set: { microUsd: sql`${monthlySpend.microUsd} + excluded.micro_usd` },
      })
      .returning({ microUsd: monthlySpend.microUsd });
    if (row === undefined) {
      throw new Error("Recording spend returned no row");
    }
    return row.microUsd;
  });
}

// Owner's spend in the month of now, the monthly quota, and when it resets.
// A month with no row has no spend.
async function readMonthlyUsage(
  owner: UserId,
  now: Date,
): Promise<MonthlyUsage> {
  const [row] = await withAppErrors("readMonthlyUsage", () =>
    getDb()
      .select({ microUsd: monthlySpend.microUsd })
      .from(monthlySpend)
      .where(
        and(
          monthlySpendOwnedBy(owner),
          eq(monthlySpend.month, spendMonthOf(now)),
        ),
      ),
  );
  return {
    spentMicroUsd: row?.microUsd ?? 0,
    limitMicroUsd: MONTHLY_QUOTA_MICRO_USD,
    resetsOn: quotaResetsOn(now),
  };
}

export type { MonthlyUsage };
export { readMonthlyUsage, recordSpend };
