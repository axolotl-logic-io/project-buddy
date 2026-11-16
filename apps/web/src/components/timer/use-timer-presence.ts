"use client";

import { useEffect, useState } from "react";
import {
  TIMER_PRESENCE_REPORT_MS,
  type TimerPresence,
} from "@/timer/presence.ts";
import { reportTimerPresenceAction } from "@/timer/presence-action.ts";
import type { TimerSchedule } from "@/timer/schedule.ts";

// What the page knows of the others following schedule: nothing yet, or
// the last report's answer. The page reports as it opens, every
// TIMER_PRESENCE_REPORT_MS while open, and as its tab comes back into view.
// A failed report shows the count as unavailable, never a stale count or a
// made-up zero, until a later report succeeds. Reporting never stops the
// countdown.
function useTimerPresence(schedule: TimerSchedule): TimerPresence | undefined {
  const [presence, setPresence] = useState<TimerPresence | undefined>();
  const { workMinutes, breakMinutes, startMs } = schedule;

  useEffect(() => {
    let live = true;
    async function report(): Promise<void> {
      let answer: TimerPresence;
      try {
        answer = await reportTimerPresenceAction({
          workMinutes,
          breakMinutes,
          startMs,
        });
      } catch {
        answer = { kind: "unavailable" };
      }
      if (live) {
        setPresence(answer);
      }
    }
    function reportWhenShown(): void {
      if (document.visibilityState === "visible") {
        report().catch(() => undefined);
      }
    }
    report().catch(() => undefined);
    const interval = setInterval(reportWhenShown, TIMER_PRESENCE_REPORT_MS);
    document.addEventListener("visibilitychange", reportWhenShown);
    return (): void => {
      live = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", reportWhenShown);
    };
  }, [workMinutes, breakMinutes, startMs]);

  return presence;
}

export { useTimerPresence };
