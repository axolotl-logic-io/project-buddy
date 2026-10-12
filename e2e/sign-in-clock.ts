// Moves the sign-in tables' clocks forward for one test's rows, as if their
// time had passed: a link's 30 minutes, a rate limit's window, a lockout's
// window. Each changes only the rows of the user, key or client it is
// given, so tests beside it see no change.
import { eq, type SQL, sql } from "drizzle-orm";
import { getDb } from "@/db/client.ts";
import { failedLogins } from "@/db/tables/failed-logins.ts";
import { rateLimits } from "@/db/tables/rate-limits.ts";
import { loginLinks } from "@/db/tables/users.ts";
import type { UserId } from "@/ids.ts";

// Longer ago than any window or lifetime of the sign-in tables.
const LONG_AGO: SQL = sql`now() - interval '1 day'`;

// Every sign-in link of the user's expires, as 30 minutes after sending.
async function expireLoginLinksOf(userId: UserId): Promise<void> {
  await getDb()
    .update(loginLinks)
    .set({ expiresAt: LONG_AGO })
    .where(eq(loginLinks.userId, userId));
}

// The rate limit's window for key passes, as after the wait.
async function endRateLimitWindow(key: string): Promise<void> {
  await getDb()
    .update(rateLimits)
    .set({ windowStartedAt: LONG_AGO })
    .where(eq(rateLimits.key, key));
}

// The client's lockout window passes, as after the wait.
async function endLockout(clientKey: string): Promise<void> {
  await getDb()
    .update(failedLogins)
    .set({ windowStartedAt: LONG_AGO })
    .where(eq(failedLogins.clientKey, clientKey));
}

export { endLockout, endRateLimitWindow, expireLoginLinksOf };
