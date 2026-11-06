"use server";

import { currentUser } from "@/auth/current-user.ts";
import { type FlagId, hiddenFromSwitched } from "@/flags/flags.ts";
import { writeHiddenFlagsCookie } from "@/flags/seed-hidden-flags.ts";

// Refresh the browser's copy from the authenticated account. Appearance
// remains a browser preference and keeps its pre-paint cookie.
export async function refreshPreferencesAction(): Promise<
  FlagId[] | undefined
> {
  const user = await currentUser();
  if (user === undefined) {
    return undefined;
  }
  const hidden = hiddenFromSwitched(user.hiddenExtras);
  await writeHiddenFlagsCookie(hidden);
  return hidden;
}
