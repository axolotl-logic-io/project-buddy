// The sign-up page's invite code check: a client that has failed too often
// is locked out, even with the right invite code; a wrong invite code counts
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
import { readInviteCode } from "@/env.ts";

export type InviteCodeCheck = "right" | "wrong" | "locked-out";

// Checks the invite code against INVITE_CODE, keeping the failed-login
// count of the client the request's headers name. Throws an AppError when
// the count can't be read or saved.
export async function checkSignUpInviteCode(
  inviteCode: string,
  requestHeaders: Headers,
): Promise<InviteCodeCheck> {
  const db = getDb();
  const clientKey = clientKeyFromHeaders(requestHeaders);
  const now = new Date();

  if (isLockedOut(await readFailedLogins(db, clientKey), now)) {
    return "locked-out";
  }
  if (!(await constantTimeEqual(inviteCode, readInviteCode()))) {
    await recordFailedLogin(db, clientKey, now);
    return "wrong";
  }
  await clearFailedLogins(db, clientKey);
  return "right";
}
