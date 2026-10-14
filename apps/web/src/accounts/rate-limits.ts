// The site's rate limits: how many sign-in emails may be asked for, so that
// no one can flood an inbox or Resend's quota, or keep someone else from
// signing in; and how many wrong invite codes a client may enter before it
// is locked out of signing up.
//
// Each limit counts requests under its own key in the rate_limits table,
// within one fixed window per key that starts at the key's first request,
// with one atomic upsert per key. A key names a client by its client key,
// and an address only by the address's HMAC, keyed by SESSION_SECRET, so
// the table holds no address. Counting also deletes rows whose windows have
// passed, a few at a time, so the table doesn't grow forever.
import { and, eq, inArray, lte, type SQL, sql } from "drizzle-orm";
import type { PgInsertValue } from "drizzle-orm/pg-core";
import { normalizeEmail } from "@/accounts/users-store.ts";
import { hmacSha256 } from "@/auth/hmac.ts";
import { type Database, getDb } from "@/db/client.ts";
import { rateLimits } from "@/db/tables/rate-limits.ts";
import { readSessionSecret } from "@/env.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";

const MS_PER_MINUTE = 60_000;
const HEXADECIMAL = 16;
const BYTE_HEX_DIGITS = 2;

interface RateLimit {
  // Requests allowed within one window.
  readonly requests: number;
  readonly windowMinutes: number;
}

// Asking for a sign-in link, from the sign-in or the sign-up page, is
// limited per address and client, so a client can ask for a few links to an
// address; per address across every client, so an inbox gets at most a few
// more, counting only requests within the first limit, so one client alone
// can't use up an address's links; and per client, across every address it
// asks for.
const ADDRESS_AND_CLIENT_LIMIT: RateLimit = { requests: 3, windowMinutes: 15 };
const ADDRESS_LIMIT: RateLimit = { requests: 10, windowMinutes: 15 };
const CLIENT_LIMIT: RateLimit = { requests: 20, windowMinutes: 60 };
// A client that enters this many wrong invite codes within the window of its
// first is locked out until that window ends.
const WRONG_INVITE_CODE_LIMIT: RateLimit = { requests: 5, windowMinutes: 15 };

// After the longest window, a row counts nothing, so it can be deleted.
const LONGEST_WINDOW_MINUTES: number = Math.max(
  ADDRESS_AND_CLIENT_LIMIT.windowMinutes,
  ADDRESS_LIMIT.windowMinutes,
  CLIENT_LIMIT.windowMinutes,
  WRONG_INVITE_CODE_LIMIT.windowMinutes,
);
// The most rows one count deletes.
const EXPIRED_ROWS_PER_COUNT = 100;

// Sets the address HMAC apart from every other use of SESSION_SECRET.
const ADDRESS_KEY_LABEL = "project-buddy rate-limit address\n";
// The length of an address's HMAC in a key: SHA-256 in hexadecimal.
const ADDRESS_HMAC_LENGTH = 64;

// Each limit's keys start with its own prefix. Rows of an older format,
// "address:" followed by the address itself, are no longer counted and are
// deleted once their windows have passed.
const ADDRESS_PREFIX = "address:";
const ADDRESS_AND_CLIENT_PREFIX = "address-client:";
const CLIENT_PREFIX = "client:";
const WRONG_INVITE_CODE_PREFIX = "wrong-invite-code:";

// The address's HMAC, in hexadecimal, as the keys name it.
async function addressHmac(address: string): Promise<string> {
  const digest = await hmacSha256(
    readSessionSecret(),
    `${ADDRESS_KEY_LABEL}${normalizeEmail(address)}`,
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(HEXADECIMAL).padStart(BYTE_HEX_DIGITS, "0"),
  ).join("");
}

function addressKey(hmac: string): string {
  return `${ADDRESS_PREFIX}${hmac}`;
}

// The client follows the address's HMAC, whose length is fixed, so the
// client is everything after ADDRESS_AND_CLIENT_CLIENT_START.
function addressAndClientKey(hmac: string, clientKey: string): string {
  return `${ADDRESS_AND_CLIENT_PREFIX}${hmac}:${clientKey}`;
}

// Where the client starts in an address-and-client key, counting from 1 as
// Postgres's substr does.
const ADDRESS_AND_CLIENT_CLIENT_START: number =
  ADDRESS_AND_CLIENT_PREFIX.length + ADDRESS_HMAC_LENGTH + ":".length + 1;

function clientKeyOf(clientKey: string): string {
  return `${CLIENT_PREFIX}${clientKey}`;
}

function wrongInviteCodeKey(clientKey: string): string {
  return `${WRONG_INVITE_CODE_PREFIX}${clientKey}`;
}

function windowStartCutoff(limit: RateLimit, now: Date): Date {
  return new Date(now.getTime() - limit.windowMinutes * MS_PER_MINUTE);
}

// The upsert that counts requests under a key.
interface Counting {
  // The key's row when it has none: the request, in a window starting now.
  readonly values: PgInsertValue<typeof rateLimits>;
  // The key's row when it has one: the request in its window, or in a new
  // one starting now if the last one has passed.
  readonly set: { readonly count: SQL; readonly windowStartedAt: SQL };
}

// Counts `increment` (1 unless given) requests under the key at `now`.
function counting(
  key: string,
  limit: RateLimit,
  { now, increment = sql`1` }: { readonly now: Date; readonly increment?: SQL },
): Counting {
  const windowPassed = sql`${rateLimits.windowStartedAt} <= ${windowStartCutoff(limit, now).toISOString()}::timestamptz`;
  return {
    values: { key, count: increment, windowStartedAt: now },
    set: {
      count: sql`case when ${windowPassed} then ${increment} else ${rateLimits.count} + ${increment} end`,
      windowStartedAt: sql`case when ${windowPassed} then ${now.toISOString()}::timestamptz else ${rateLimits.windowStartedAt} end`,
    },
  };
}

// Up to EXPIRED_ROWS_PER_COUNT rows whose windows have passed, skipping any
// another request holds, so that deleting them never waits.
function expiredRows(db: Database, now: Date): SQL {
  const cutoff = new Date(
    now.getTime() - LONGEST_WINDOW_MINUTES * MS_PER_MINUTE,
  );
  return inArray(
    rateLimits.key,
    db
      .select({ key: rateLimits.key })
      .from(rateLimits)
      .where(lte(rateLimits.windowStartedAt, cutoff))
      .limit(EXPIRED_ROWS_PER_COUNT)
      .for("update", { skipLocked: true }),
  );
}

// Whether the count under the key, as this transaction sees it, is within
// the limit.
function isWithin(key: string, limit: RateLimit): SQL {
  return sql`exists (select 1 from ${rateLimits} "counted" where "counted"."key" = ${key} and "counted"."count" <= ${limit.requests})`;
}

// Counts a request for a sign-in link to the address from the client, and
// answers whether it is within every limit. Every request counts against
// the address-and-client and the client limits; it counts against the
// address's only when it is within those two. The same queries run whatever
// the answer, so the time taken reveals nothing.
async function countLoginLinkRequest(
  address: string,
  clientKey: string,
  now: Date,
): Promise<boolean> {
  const hmac = await addressHmac(address);
  const pairKey = addressAndClientKey(hmac, clientKey);
  const clientRowKey = clientKeyOf(clientKey);
  const withinOthers = sql`case when ${isWithin(pairKey, ADDRESS_AND_CLIENT_LIMIT)} and ${isWithin(clientRowKey, CLIENT_LIMIT)} then 1 else 0 end`;
  const byPair = counting(pairKey, ADDRESS_AND_CLIENT_LIMIT, { now });
  const byClient = counting(clientRowKey, CLIENT_LIMIT, { now });
  const byAddress = counting(addressKey(hmac), ADDRESS_LIMIT, {
    now,
    increment: withinOthers,
  });
  const db = getDb();
  const [[forPair], [forClient], [forAddress]] = await withAppErrors(
    "countLoginLinkRequest",
    () =>
      db.batch([
        db
          .insert(rateLimits)
          .values(byPair.values)
          .onConflictDoUpdate({ target: rateLimits.key, set: byPair.set })
          .returning({ count: rateLimits.count }),
        db
          .insert(rateLimits)
          .values(byClient.values)
          .onConflictDoUpdate({ target: rateLimits.key, set: byClient.set })
          .returning({ count: rateLimits.count }),
        // Last of the counts, as it reads the two before it.
        db
          .insert(rateLimits)
          .values(byAddress.values)
          .onConflictDoUpdate({ target: rateLimits.key, set: byAddress.set })
          .returning({ count: rateLimits.count }),
        db.delete(rateLimits).where(expiredRows(db, now)),
      ]),
  );
  return (
    (forPair?.count ?? 0) <= ADDRESS_AND_CLIENT_LIMIT.requests &&
    (forClient?.count ?? 0) <= CLIENT_LIMIT.requests &&
    (forAddress?.count ?? 0) <= ADDRESS_LIMIT.requests
  );
}

// Whether the client has entered too many wrong invite codes within the
// window of its first.
async function isLockedOutOfInviteCode(
  clientKey: string,
  now: Date,
): Promise<boolean> {
  // The operation's name has spaces, since Biome's noSecrets takes the
  // function's name in a string for a secret.
  const [row] = await withAppErrors("read invite code lockout", () =>
    getDb()
      .select({ key: rateLimits.key })
      .from(rateLimits)
      .where(
        and(
          eq(rateLimits.key, wrongInviteCodeKey(clientKey)),
          sql`${rateLimits.count} >= ${WRONG_INVITE_CODE_LIMIT.requests}`,
          sql`${rateLimits.windowStartedAt} > ${windowStartCutoff(WRONG_INVITE_CODE_LIMIT, now).toISOString()}::timestamptz`,
        ),
      ),
  );
  return row !== undefined;
}

// Counts a wrong invite code against the client.
async function countWrongInviteCode(
  clientKey: string,
  now: Date,
): Promise<void> {
  const byClient = counting(
    wrongInviteCodeKey(clientKey),
    WRONG_INVITE_CODE_LIMIT,
    { now },
  );
  const db = getDb();
  await withAppErrors("countWrongInviteCode", () =>
    db.batch([
      db
        .insert(rateLimits)
        .values(byClient.values)
        .onConflictDoUpdate({ target: rateLimits.key, set: byClient.set }),
      db.delete(rateLimits).where(expiredRows(db, now)),
    ]),
  );
}

// Forgets the client's wrong invite codes, as the right one does.
async function clearWrongInviteCodes(clientKey: string): Promise<void> {
  await withAppErrors("clearWrongInviteCodes", () =>
    getDb()
      .delete(rateLimits)
      .where(eq(rateLimits.key, wrongInviteCodeKey(clientKey))),
  );
}

// For the tests only: every window of the address's or the client's limits
// passes, as after the wait, by deleting their rows. With an address, the
// address's own and its address-and-client rows; with a client, its own,
// its wrong invite codes and its address-and-client rows; with both, only
// the rows of that address and client together.
async function endRateLimitWindowsFor({
  address,
  clientKey,
}: {
  readonly address?: string;
  readonly clientKey?: string;
}): Promise<void> {
  let hmac: string | undefined;
  if (address !== undefined) {
    hmac = await addressHmac(address);
  }
  await getDb().delete(rateLimits).where(rowsOf(hmac, clientKey));
}

// The rows endRateLimitWindowsFor deletes.
function rowsOf(hmac: string | undefined, clientKey: string | undefined): SQL {
  if (hmac !== undefined && clientKey !== undefined) {
    return sql`${rateLimits.key} = ${addressAndClientKey(hmac, clientKey)}`;
  }
  if (hmac !== undefined) {
    return sql`(${rateLimits.key} = ${addressKey(hmac)} or starts_with(${rateLimits.key}, ${`${ADDRESS_AND_CLIENT_PREFIX}${hmac}:`}))`;
  }
  if (clientKey !== undefined) {
    return sql`(${rateLimits.key} in (${clientKeyOf(clientKey)}, ${wrongInviteCodeKey(clientKey)}) or (starts_with(${rateLimits.key}, ${ADDRESS_AND_CLIENT_PREFIX}) and substr(${rateLimits.key}, ${ADDRESS_AND_CLIENT_CLIENT_START}::int) = ${clientKey}))`;
  }
  return sql`false`;
}

export {
  clearWrongInviteCodes,
  countLoginLinkRequest,
  countWrongInviteCode,
  endRateLimitWindowsFor,
  isLockedOutOfInviteCode,
};
