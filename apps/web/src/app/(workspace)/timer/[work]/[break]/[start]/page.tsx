import type { Metadata } from "next";
import type { JSX } from "react";
import {
  InvalidTimer,
  TimerDisplay,
} from "@/components/timer/timer-display.tsx";
import { parseTimerSchedule } from "@/timer/schedule.ts";
import { TIMER_COPY } from "@/ui/copy/timer.ts";

export const metadata: Metadata = { title: TIMER_COPY.runningTitle };

// A timer link: the schedule its path names, running, or why it names
// none. The link holds only the schedule, so opening it reaches no quest,
// and anyone may open it, signed in or not.
export default async function TimerPage({
  params,
}: PageProps<"/timer/[work]/[break]/[start]">): Promise<JSX.Element> {
  const schedule = parseTimerSchedule(await params);
  return (
    <div className="workspace-content">
      {schedule === undefined && <InvalidTimer />}
      {schedule !== undefined && <TimerDisplay schedule={schedule} />}
    </div>
  );
}
