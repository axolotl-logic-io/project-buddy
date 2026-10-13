// The sign-up page's invite-code check, with its lockout. A client that
// enters a wrong code MAX_FAILED_LOGINS times within FAILED_LOGIN_WINDOW_MS
// of its first failure is refused, even with the right code, until that
// window ends; the right code clears the client's count. The counts live in
// the failed_logins table.
import { eq, sql } from "drizzle-orm";
import { constantTimeEqual } from "@/auth/hmac.ts";
import { getDb } from "@/db/client.ts";
import { failedLogins } from "@/db/tables/failed-logins.ts";
import { readInviteCode } from "@/env.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";

const MS_PER_MINUTE = 60_000;
const FAILED_LOGIN_WINDOW_MINUTES = 15;
const MAX_FAILED_LOGINS = 5;
const FAILED_LOGIN_WINDOW_MS: number =
  FAILED_LOGIN_WINDOW_MINUTES * MS_PER_MINUTE;

type InviteCodeCheck = "right" | "wrong" | "locked-out";

interface FailedLoginCount {
  failures: number;
  windowStartedAt: Date;
}

function isLockedOut(count: FailedLoginCount | undefined, now: Date): boolean {
  if (!count) {
    return false;
  }
  const windowEndsAt = count.windowStartedAt.getTime() + FAILED_LOGIN_WINDOW_MS;
  return count.failures >= MAX_FAILED_LOGINS && now.getTime() < windowEndsAt;
}

async function readFailedLogins(
  clientKey: string,
): Promise<FailedLoginCount | undefined> {
  const [count] = await withAppErrors("readFailedLogins", () =>
    getDb()
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
async function recordFailedLogin(clientKey: string, now: Date): Promise<void> {
  const windowCutoff = new Date(now.getTime() - FAILED_LOGIN_WINDOW_MS);
  const windowPassed = sql`${failedLogins.windowStartedAt} <= ${windowCutoff.toISOString()}::timestamptz`;
  await withAppErrors("recordFailedLogin", () =>
    getDb()
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

async function clearFailedLogins(clientKey: string): Promise<void> {
  await withAppErrors("clearFailedLogins", () =>
    getDb().delete(failedLogins).where(eq(failedLogins.clientKey, clientKey)),
  );
}

// Checks the invite code against INVITE_CODE for the client, keeping the
// client's lockout. Throws an AppError when the count can't be read or saved.
async function checkInviteCode(
  inviteCode: string,
  clientKey: string,
  now: Date,
): Promise<InviteCodeCheck> {
  if (isLockedOut(await readFailedLogins(clientKey), now)) {
    return "locked-out";
  }
  if (!(await constantTimeEqual(inviteCode, readInviteCode()))) {
    await recordFailedLogin(clientKey, now);
    return "wrong";
  }
  await clearFailedLogins(clientKey);
  return "right";
}

export type { InviteCodeCheck };
export { checkInviteCode, MAX_FAILED_LOGINS };
