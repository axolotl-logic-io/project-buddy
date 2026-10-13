// The sign-up page's invite-code check. A client that has entered too many
// wrong codes in a short time is locked out, even with the right code, until
// the wait has passed; the right code clears the client's count. The
// lockout is one of the rate limits in src/accounts/rate-limits.ts.
import {
  clearWrongInviteCodes,
  countWrongInviteCode,
  isLockedOutOfInviteCode,
} from "@/accounts/rate-limits.ts";
import { constantTimeEqual } from "@/auth/hmac.ts";
import { readInviteCode } from "@/env.ts";

type InviteCodeCheck = "right" | "wrong" | "locked-out";

// Checks the invite code against INVITE_CODE for the client, keeping the
// client's lockout. Throws an AppError when the count can't be read or saved.
async function checkInviteCode(
  inviteCode: string,
  clientKey: string,
  now: Date,
): Promise<InviteCodeCheck> {
  if (await isLockedOutOfInviteCode(clientKey, now)) {
    return "locked-out";
  }
  if (!(await constantTimeEqual(inviteCode, readInviteCode()))) {
    await countWrongInviteCode(clientKey, now);
    return "wrong";
  }
  await clearWrongInviteCodes(clientKey);
  return "right";
}

export type { InviteCodeCheck };
export { checkInviteCode };
