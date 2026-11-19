"use client";

import { type JSX, useState } from "react";
import { TimerDisplay } from "@/components/timer/timer-display.tsx";
import { TimerSettings } from "@/components/timer/timer-setup.tsx";
import type { TimerSchedule } from "@/timer/schedule.ts";

function QuestTimer(): JSX.Element {
  const [schedule, start] = useState<TimerSchedule>();
  return (
    <div className="quest-timer">
      {schedule !== undefined && (
        <TimerDisplay schedule={schedule} showNextDuration={true} />
      )}
      <TimerSettings onStart={start} running={schedule !== undefined} />
    </div>
  );
}

export { QuestTimer };
