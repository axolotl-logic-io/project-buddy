import type { Metadata } from "next";
import type { JSX } from "react";
import {
  InvalidTimer,
  TimerDisplay,
} from "@/components/timer/timer-display.tsx";
import {
  parseTimerSchedule,
  TIMER_ONLY_PARAM,
  TIMER_ONLY_VALUE,
} from "@/timer/schedule.ts";
import { TIMER_COPY } from "@/ui/copy/timer.ts";

export const metadata: Metadata = { title: TIMER_COPY.runningTitle };

// A timer link: the schedule its path names, running, or why it names
// none. The link holds only the schedule, so opening it reaches no quest,
// and anyone may open it, signed in or not.
export default async function TimerPage({
  params,
  searchParams,
}: PageProps<"/timer/[work]/[break]/[start]">): Promise<JSX.Element> {
  const schedule = parseTimerSchedule(await params);
  // ?mode=focus shows only the timer: no header, trail or panels.
  const timerOnly = (await searchParams)[TIMER_ONLY_PARAM] === TIMER_ONLY_VALUE;
  let className = "workspace-content";
  if (timerOnly) {
    className += " timer-only";
  }
  return (
    <div className={className}>
      {schedule === undefined && <InvalidTimer />}
      {schedule !== undefined && <TimerDisplay schedule={schedule} />}
    </div>
  );
}
