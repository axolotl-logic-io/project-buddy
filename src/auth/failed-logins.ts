import { eq, sql } from "drizzle-orm";
import type { Database } from "@/db/client.ts";
import { failedLogins } from "@/db/tables/failed-logins.ts";
import { withAppErrors } from "@/errors/app-error.ts";

export const MAX_FAILED_LOGINS = 5;
export const FAILED_LOGIN_WINDOW_MS = 15 * 60 * 1000;

export type FailedLoginCount = {
  failures: number;
  windowStartedAt: Date;
};

// A client is locked out once it reaches MAX_FAILED_LOGINS within
// FAILED_LOGIN_WINDOW_MS of its first failure.
export function isLockedOut(
  count: FailedLoginCount | undefined,
  now: Date,
): boolean {
  if (!count) {
    return false;
  }
  const windowEndsAt = count.windowStartedAt.getTime() + FAILED_LOGIN_WINDOW_MS;
  return count.failures >= MAX_FAILED_LOGINS && now.getTime() < windowEndsAt;
}

// Vercel sets x-forwarded-for to the client's address.
export function clientKeyFromHeaders(headers: Headers): string {
  const [firstAddress = ""] = headers.get("x-forwarded-for")?.split(",") ?? [];
  const address = firstAddress.trim();
  if (address === "") {
    return "unknown";
  }
  return address;
}

export async function readFailedLogins(
  db: Database,
  clientKey: string,
): Promise<FailedLoginCount | undefined> {
  const [count] = await withAppErrors("readFailedLogins", () =>
    db
      .select({
        failures: failedLogins.failures,
        windowStartedAt: failedLogins.windowStartedAt,
      })
      .from(failedLogins)
      .where(eq(failedLogins.clientKey, clientKey)),
  );
  return count;
}

// One atomic upsert: counts the failure in the current window, or starts a new
// window at `now` if the previous one has passed.
export async function recordFailedLogin(
  db: Database,
  clientKey: string,
  now: Date,
): Promise<void> {
  const windowCutoff = new Date(now.getTime() - FAILED_LOGIN_WINDOW_MS);
  const windowPassed = sql`${failedLogins.windowStartedAt} <= ${windowCutoff.toISOString()}::timestamptz`;
  await withAppErrors("recordFailedLogin", () =>
    db
      .insert(failedLogins)
      .values({ clientKey, failures: 1, windowStartedAt: now })
      .onConflictDoUpdate({
        target: failedLogins.clientKey,
        set: {
          failures: sql`case when ${windowPassed} then 1 else ${failedLogins.failures} + 1 end`,
          windowStartedAt: sql`case when ${windowPassed} then ${now.toISOString()}::timestamptz else ${failedLogins.windowStartedAt} end`,
        },
      }),
  );
}

export async function clearFailedLogins(
  db: Database,
  clientKey: string,
): Promise<void> {
  await withAppErrors("clearFailedLogins", () =>
    db.delete(failedLogins).where(eq(failedLogins.clientKey, clientKey)),
  );
}
