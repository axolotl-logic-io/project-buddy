// The server's one write of the hidden-extras cookie (its shape is in
// flag-choice.ts), for saving a choice and for signing in. Not a Server
// Action module: the browser can't call these.
import { cookies } from "next/headers";
import { readSessionUser } from "@/accounts/users-store.ts";
import type { SessionUser } from "@/auth/session-token.ts";
import { hiddenFlagsCookie } from "@/flags/flag-choice.ts";
import { type FlagId, knownFlags } from "@/flags/flags.ts";

// Keeps hidden as the choice in this browser's cookie.
async function writeHiddenFlagsCookie(
  hidden: readonly FlagId[],
): Promise<void> {
  (await cookies()).set(hiddenFlagsCookie(hidden));
}

// Copies the choice saved to user's account into this browser's cookie,
// replacing whatever the browser kept before, such as another user's. For
// signing in; a user who no longer exists at that epoch copies nothing.
async function seedHiddenFlags(user: SessionUser): Promise<void> {
  const account = await readSessionUser(user.id, user.sessionEpoch);
  if (account === undefined) {
    return;
  }
  await writeHiddenFlagsCookie(knownFlags(account.hiddenExtras));
}

export { seedHiddenFlags, writeHiddenFlagsCookie };
