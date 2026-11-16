// Who else follows a timer schedule: each signed-in account reports while
// its timer is open, and a report counts until it is
// TIMER_PRESENCE_EXPIRY_MS old (src/timer/presence.ts). An account counts once however many tabs or
// devices it has open on the schedule. The count is of recent reports, not
// of people watching at this moment, and it names no one. Every function
// takes the acting user first. No model is called.
import { and, count, eq, gte, lt, not } from "drizzle-orm";
import { timerPresenceOwnedBy } from "@/accounts/owner-scope.ts";
import { getDb } from "@/db/client.ts";
import { timerPresence } from "@/db/tables/timer-presence.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import type { UserId } from "@/ids.ts";
import { TIMER_PRESENCE_EXPIRY_MS } from "@/timer/presence.ts";
import type { TimerSchedule } from "@/timer/schedule.ts";

// Records that user follows schedule at now, forgets every report that has
// expired, and answers how many other accounts reported following the same
// schedule within TIMER_PRESENCE_EXPIRY_MS of now.
function reportTimerPresence(
  user: UserId,
  schedule: TimerSchedule,
  now: Date,
): Promise<number> {
  return withAppErrors("reportTimerPresence", async () => {
    const db = getDb();
    const since = new Date(now.getTime() - TIMER_PRESENCE_EXPIRY_MS);
    await db
      .insert(timerPresence)
      .values({ userId: user, ...schedule, reportedAt: now })
      .onConflictDoUpdate({
        target: [
          timerPresence.userId,
          timerPresence.workMinutes,
          timerPresence.breakMinutes,
          timerPresence.startMs,
        ],
        set: { reportedAt: now },
      });
    await db.delete(timerPresence).where(lt(timerPresence.reportedAt, since));
    const [row] = await db
      .select({ others: count() })
      .from(timerPresence)
      .where(
        and(
          eq(timerPresence.workMinutes, schedule.workMinutes),
          eq(timerPresence.breakMinutes, schedule.breakMinutes),
          eq(timerPresence.startMs, schedule.startMs),
          gte(timerPresence.reportedAt, since),
          not(timerPresenceOwnedBy(user)),
        ),
      );
    return row?.others ?? 0;
  });
}

export { reportTimerPresence };
