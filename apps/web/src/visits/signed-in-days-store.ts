import { count, min } from "drizzle-orm";
import { signedInDayOwnedBy } from "@/accounts/owner-scope.ts";
import { getDb } from "@/db/client.ts";
import { signedInDays } from "@/db/tables/signed-in-days.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import type { UserId } from "@/ids.ts";

interface SignedInDays {
  readonly total: number;
  readonly trackedSince: string | null;
}

// Records only owner's server-dated visit. The unique account/date index makes
// simultaneous reports, including from other devices, idempotent. Answers
// whether this report added a date. Time is supplied by the authenticated
// boundary, never by the browser.
function recordSignedInDay(owner: UserId, now: Date): Promise<boolean> {
  return withAppErrors("record signed-in day", async () => {
    const rows = await getDb()
      .insert(signedInDays)
      .values({ userId: owner, visitedOn: now.toISOString().slice(0, 10) })
      .onConflictDoNothing()
      .returning({ visitedOn: signedInDays.visitedOn });
    return rows.length > 0;
  });
}

// Reads owner's total and first tracked date without recording a visit.
function readSignedInDays(owner: UserId): Promise<SignedInDays> {
  return withAppErrors("read signed-in days", async () => {
    const [row] = await getDb()
      .select({ total: count(), trackedSince: min(signedInDays.visitedOn) })
      .from(signedInDays)
      .where(signedInDayOwnedBy(owner));
    return row ?? { total: 0, trackedSince: null };
  });
}

export type { SignedInDays };
export { readSignedInDays, recordSignedInDay };
