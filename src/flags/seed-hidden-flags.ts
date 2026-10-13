// The server's one write of the hidden-extras cookie (its shape is in
// flag-choice.ts), for saving a choice and for signing in. Not a Server
// Action module: the browser can't call these.
import { cookies } from "next/headers";
import { hiddenFlagsCookie } from "@/flags/flag-choice.ts";
import { type FlagId, knownFlags } from "@/flags/flags.ts";

// Keeps hidden as the choice in this browser's cookie.
async function writeHiddenFlagsCookie(
  hidden: readonly FlagId[],
): Promise<void> {
  (await cookies()).set(hiddenFlagsCookie(hidden));
}

// Copies the choice saved to her account, the hiddenExtras signing in has
// just read with her, into this browser's cookie, replacing whatever the
// browser kept before, such as another user's. Reads nothing itself.
async function seedHiddenFlags(hiddenExtras: readonly string[]): Promise<void> {
  await writeHiddenFlagsCookie(knownFlags(hiddenExtras));
}

export { seedHiddenFlags, writeHiddenFlagsCookie };
