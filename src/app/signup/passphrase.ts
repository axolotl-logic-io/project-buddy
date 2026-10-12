// The sign-up page's passphrase check: a client that has failed too often
// is locked out, even with the right passphrase; a wrong passphrase counts
// against the client, and the right one clears its count.
import {
  clearFailedLogins,
  clientKeyFromHeaders,
  isLockedOut,
  readFailedLogins,
  recordFailedLogin,
} from "@/auth/failed-logins.ts";
import { constantTimeEqual } from "@/auth/hmac.ts";
import { getDb } from "@/db/client.ts";
import { readSitePassphrase } from "@/env.ts";

export type PassphraseCheck = "right" | "wrong" | "locked-out";

// Checks the passphrase against SITE_PASSPHRASE, keeping the failed-login
// count of the client the request's headers name. Throws an AppError when
// the count can't be read or saved.
export async function checkSignUpPassphrase(
  passphrase: string,
  requestHeaders: Headers,
): Promise<PassphraseCheck> {
  const db = getDb();
  const clientKey = clientKeyFromHeaders(requestHeaders);
  const now = new Date();

  if (isLockedOut(await readFailedLogins(db, clientKey), now)) {
    return "locked-out";
  }
  if (!(await constantTimeEqual(passphrase, readSitePassphrase()))) {
    await recordFailedLogin(db, clientKey, now);
    return "wrong";
  }
  await clearFailedLogins(db, clientKey);
  return "right";
}
