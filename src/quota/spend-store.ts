// What each user's Claude calls cost per calendar month (UTC), stored in
// Postgres's monthly_spend: added to after every model call (spend-meter.ts)
// and read before each message, new chat and new project (quota.ts) and on
// the account page. An addition is retried while the database is briefly
// unreachable, so a short outage after a reply doesn't lose its cost.
import { and, eq, sql } from "drizzle-orm";
import { monthlySpendOwnedBy } from "@/accounts/owner-scope.ts";
import { getDb } from "@/db/client.ts";
import { monthlySpend } from "@/db/tables/monthly-spend.ts";
import { databaseErrorCase, violatesForeignKey } from "@/errors/neon-errors.ts";
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

// The foreign key from a month's spend to its user (drizzle/0005_accounts.sql),
// which an addition for a user deleted meanwhile breaks.
const OWNER_KEY = "monthly_spend_user_id_users_id_fk";

// How long recordSpend waits before each retry of an addition the database
// couldn't be reached for, in milliseconds: so at most 3 attempts in all.
const FIRST_RETRY_DELAY_MS = 100;
const SECOND_RETRY_DELAY_MS = 400;
const SPEND_RETRY_DELAYS_MS: readonly number[] = [
  FIRST_RETRY_DELAY_MS,
  SECOND_RETRY_DELAY_MS,
];

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

// Adds microUsd to owner's month in one upsert. The spend of an owner whose
// account no longer exists is dropped; any other failure throws.
async function addSpend(
  owner: UserId,
  microUsd: number,
  now: Date,
): Promise<void> {
  try {
    // The row it writes or adds to has user_id owner, by the insert's
    // values and the (user_id, month) key it conflicts on, so it needs no
    // ownership predicate (src/accounts/owner-scope.ts).
    await getDb()
      .insert(monthlySpend)
      .values({ userId: owner, month: spendMonthOf(now), microUsd })
      .onConflictDoUpdate({
        target: [monthlySpend.userId, monthlySpend.month],
        set: {
          microUsd: sql`${monthlySpend.microUsd} + excluded.micro_usd`,
        },
      });
  } catch (error) {
    if (!violatesForeignKey(error, OWNER_KEY)) {
      throw error;
    }
  }
}

// Adds microUsd to owner's month, trying again after each of retryDelays,
// in milliseconds, while the database can't be reached.
async function addSpendRetrying(
  owner: UserId,
  microUsd: number,
  now: Date,
  retryDelays: readonly number[],
): Promise<void> {
  try {
    await addSpend(owner, microUsd, now);
  } catch (error) {
    const [delay, ...laterDelays] = retryDelays;
    if (
      delay === undefined ||
      databaseErrorCase(error) !== "database-unreachable"
    ) {
      throw error;
    }
    await wait(delay);
    await addSpendRetrying(owner, microUsd, now, laterDelays);
  }
}

// Adds microUsd to owner's spend in the month of now, in one statement, so
// calls that finish together each add their own cost. The spend of an owner
// whose account no longer exists, such as one deleted while a reply
// finished, is dropped: that is not a failure. While the database can't be
// reached, the addition is tried again after each of SPEND_RETRY_DELAYS_MS;
// an addition that committed but whose answer was lost may then be counted
// twice, which errs toward the quota (docs/decisions.md). Any other failure,
// or the last unreachable one, rejects with a logged AppError, and that
// spend is lost.
function recordSpend(
  owner: UserId,
  microUsd: number,
  now: Date,
): Promise<void> {
  return withAppErrors("recordSpend", () =>
    addSpendRetrying(owner, microUsd, now, SPEND_RETRY_DELAYS_MS),
  );
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
