// How many sign-in emails may be asked for, per address and per client, so
// that no one can flood an inbox or Resend's quota. Counted in Postgres
// (the rate_limits table), one fixed window per key that starts at the
// key's first request, with one atomic upsert per key.
import { type SQL, sql } from "drizzle-orm";
import { getDb } from "@/db/client.ts";
import { rateLimits } from "@/db/tables/rate-limits.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";

const MS_PER_MINUTE = 60_000;

interface RateLimit {
  // Requests allowed within one window.
  readonly requests: number;
  readonly windowMinutes: number;
}

// The limits on asking for a sign-in link, from the sign-in or the sign-up
// page: per address, so its inbox gets a few links at most, and per client
// (its first x-forwarded-for address), across every address it asks for.
const LOGIN_LINK_LIMITS: Readonly<Record<"address" | "client", RateLimit>> = {
  address: { requests: 3, windowMinutes: 15 },
  client: { requests: 20, windowMinutes: 60 },
};

// The upsert that counts one request under a key.
interface Counting {
  // The key's row when it has none: one request, in a window starting now.
  readonly values: typeof rateLimits.$inferInsert;
  // The key's row when it has one: one more request in its window, or one
  // in a new window starting now if the last one has passed.
  readonly set: { readonly count: SQL; readonly windowStartedAt: SQL };
}

function counting(key: string, limit: RateLimit, now: Date): Counting {
  const windowCutoff = new Date(
    now.getTime() - limit.windowMinutes * MS_PER_MINUTE,
  );
  const windowPassed = sql`${rateLimits.windowStartedAt} <= ${windowCutoff.toISOString()}::timestamptz`;
  return {
    values: { key, count: 1, windowStartedAt: now },
    set: {
      count: sql`case when ${windowPassed} then 1 else ${rateLimits.count} + 1 end`,
      windowStartedAt: sql`case when ${windowPassed} then ${now.toISOString()}::timestamptz else ${rateLimits.windowStartedAt} end`,
    },
  };
}

// The rate_limits keys of a normalized address and of a client.
function addressRateLimitKey(address: string): string {
  return `address:${address}`;
}

function clientRateLimitKey(clientKey: string): string {
  return `client:${clientKey}`;
}

// Counts a request for a sign-in link to the normalized address from the
// client, and answers whether both are still within their limits. Every
// request counts, allowed or not.
export async function countLoginLinkRequest(
  address: string,
  clientKey: string,
  now: Date,
): Promise<boolean> {
  const { address: addressLimit, client: clientLimit } = LOGIN_LINK_LIMITS;
  const byAddress = counting(addressRateLimitKey(address), addressLimit, now);
  const byClient = counting(clientRateLimitKey(clientKey), clientLimit, now);
  const db = getDb();
  const [[forAddress], [forClient]] = await withAppErrors(
    "countLoginLinkRequest",
    () =>
      db.batch([
        db
          .insert(rateLimits)
          .values(byAddress.values)
          .onConflictDoUpdate({ target: rateLimits.key, set: byAddress.set })
          .returning({ count: rateLimits.count }),
        db
          .insert(rateLimits)
          .values(byClient.values)
          .onConflictDoUpdate({ target: rateLimits.key, set: byClient.set })
          .returning({ count: rateLimits.count }),
      ]),
  );
  return (
    (forAddress?.count ?? 0) <= addressLimit.requests &&
    (forClient?.count ?? 0) <= clientLimit.requests
  );
}

export { addressRateLimitKey, clientRateLimitKey, LOGIN_LINK_LIMITS };
