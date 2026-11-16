"use client";

import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type JSX,
  useCallback,
  useId,
  useState,
} from "react";
import { useRememberedDurations } from "@/components/timer/remembered-durations.ts";
import { Button } from "@/components/ui/button.tsx";
import { SelectField } from "@/components/ui/field.tsx";
import {
  GLOBAL_START_MS,
  parseTimerDurations,
  TIMER_MINUTES,
  type TimerDurations,
  timerPath,
} from "@/timer/schedule.ts";
import { TIMER_COPY } from "@/ui/copy/timer.ts";

// The time a new schedule starts at, in milliseconds since the epoch.
function currentTimeMs(): number {
  return Date.now();
}

// The preset lengths, as a duration selector's options.
const MINUTE_OPTIONS = TIMER_MINUTES.map((minutes) => (
  <option key={minutes} value={minutes}>
    {TIMER_COPY.minutes(minutes)}
  </option>
));

// The Timer's setup: a work and a break length, each one of the presets,
// and two ways to begin. Start begins a new schedule now, with work; Join
// global timer joins the schedule everyone with these durations shares,
// wherever it is. Both open the schedule's link. It first offers the
// durations this tab last showed, or 50 and 10 minutes.
function TimerSetup({
  clock = currentTimeMs,
}: {
  // The current time in milliseconds since the epoch, for Start.
  readonly clock?: () => number;
}): JSX.Element {
  const router = useRouter();
  const remembered = useRememberedDurations();
  const [chosen, setChosen] = useState<TimerDurations | undefined>();
  const durations = chosen ?? remembered;
  const startHintId = useId();
  const globalHintId = useId();

  const changeWork = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      const { value } = event.currentTarget;
      setChosen(
        parseTimerDurations({ ...durations, workMinutes: Number(value) }),
      );
    },
    [durations],
  );
  const changeBreak = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      const { value } = event.currentTarget;
      setChosen(
        parseTimerDurations({ ...durations, breakMinutes: Number(value) }),
      );
    },
    [durations],
  );
  const start = useCallback((): void => {
    router.push(timerPath({ ...durations, startMs: clock() }));
  }, [router, durations, clock]);
  const joinGlobal = useCallback((): void => {
    router.push(timerPath({ ...durations, startMs: GLOBAL_START_MS }));
  }, [router, durations]);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label={TIMER_COPY.workLabel}
          onChange={changeWork}
          value={durations.workMinutes}
        >
          {MINUTE_OPTIONS}
        </SelectField>
        <SelectField
          label={TIMER_COPY.breakLabel}
          onChange={changeBreak}
          value={durations.breakMinutes}
        >
          {MINUTE_OPTIONS}
        </SelectField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Button aria-describedby={startHintId} onClick={start}>
            {TIMER_COPY.start}
          </Button>
          <p className="field-hint" id={startHintId}>
            {TIMER_COPY.startHint}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button
            aria-describedby={globalHintId}
            onClick={joinGlobal}
            variant="secondary"
          >
            {TIMER_COPY.joinGlobal}
          </Button>
          <p className="field-hint" id={globalHintId}>
            {TIMER_COPY.joinGlobalHint}
          </p>
        </div>
      </div>
    </div>
  );
}

export { TimerSetup };
