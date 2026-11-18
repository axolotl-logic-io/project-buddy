"use client";

import { type JSX, useCallback, useState } from "react";
import { TimerDisplay } from "@/components/timer/timer-display.tsx";
import { TimerScheduleSetup } from "@/components/timer/timer-setup.tsx";
import { Button } from "@/components/ui/button.tsx";
import type { TimerSchedule } from "@/timer/schedule.ts";
import { TIMER_COPY } from "@/ui/copy/timer.ts";

function QuestTimer(): JSX.Element {
  const [schedule, start] = useState<TimerSchedule>();
  const reset = useCallback((): void => start(undefined), []);
  return (
    <div className="quest-timer flex flex-col gap-4 pt-4">
      {schedule === undefined && <TimerScheduleSetup onStart={start} />}
      {schedule !== undefined && (
        <>
          <TimerDisplay schedule={schedule} />
          <Button variant="secondary" onClick={reset}>
            {TIMER_COPY.changeSchedule}
          </Button>
        </>
      )}
    </div>
  );
}

export { QuestTimer };
