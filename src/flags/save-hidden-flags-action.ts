"use server";

import { z } from "zod";
import { saveHiddenExtras } from "@/accounts/users-store.ts";
import { requireUser } from "@/auth/current-user.ts";
import { knownFlags, switchedFromHidden } from "@/flags/flags.ts";
import { writeHiddenFlagsCookie } from "@/flags/seed-hidden-flags.ts";

const HIDDEN_FLAGS = z.array(z.string());

// Saves hidden, the extras she now hides, to her account, as the extras
// switched from their default, then to this browser's cookie, so the cookie
// never holds a choice her account doesn't. Anything in hidden that isn't a
// known flag is left out.
export async function saveHiddenFlagsAction(hidden: unknown): Promise<void> {
  const user = await requireUser();
  const known = knownFlags(HIDDEN_FLAGS.parse(hidden));
  await saveHiddenExtras(user.id, switchedFromHidden(known));
  await writeHiddenFlagsCookie(known);
}
