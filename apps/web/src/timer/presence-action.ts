"use server";

import { requireUser } from "@/auth/current-user.ts";
import { AppError } from "@/errors/app-error.ts";
import type { TimerPresence } from "@/timer/presence.ts";
import { reportTimerPresence } from "@/timer/presence-store.ts";
import { parseTimerScheduleValue } from "@/timer/schedule.ts";

// Reports that the signed-in user follows the schedule the request names,
// and answers how many other accounts recently did, or that the count is
// unavailable, as when the request names no schedule or storage fails.
// Reporting makes no model request.
export async function reportTimerPresenceAction(
  request: unknown,
): Promise<TimerPresence> {
  const user = await requireUser();
  const schedule = parseTimerScheduleValue(request);
  if (schedule === undefined) {
    return { kind: "unavailable" };
  }
  try {
    const others = await reportTimerPresence(user.id, schedule, new Date());
    return { kind: "count", others };
  } catch (error) {
    if (error instanceof AppError) {
      return { kind: "unavailable" };
    }
    throw error;
  }
}
