// Moves the sign-in clocks forward for one test's rows, as if their time had
// passed: a link's 30 minutes. Each changes only the
// rows of the user or client it is given, so tests beside it see no change.
// The rate limits' windows end through endRateLimitWindowsFor in
// src/accounts/rate-limits.ts, which these use too.
import { eq, type SQL, sql } from "drizzle-orm";
import { getDb } from "@/db/client.ts";
import { loginLinks } from "@/db/tables/users.ts";
import type { UserId } from "@/ids.ts";

// Longer ago than a link's lifetime.
const LONG_AGO: SQL = sql`now() - interval '1 day'`;

// Every sign-in link of the user's expires, as 30 minutes after sending.
async function expireLoginLinksOf(userId: UserId): Promise<void> {
  await getDb()
    .update(loginLinks)
    .set({ expiresAt: LONG_AGO })
    .where(eq(loginLinks.userId, userId));
}

export { expireLoginLinksOf };
