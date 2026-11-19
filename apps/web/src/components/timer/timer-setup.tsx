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
  type TimerSchedule,
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

// The standalone Timer opens a link. A quest runs the same schedule in place.
function TimerSetup({
  clock = currentTimeMs,
}: {
  readonly clock?: () => number;
}): JSX.Element {
  const router = useRouter();
  const open = useCallback(
    (schedule: TimerSchedule): void => {
      router.push(timerPath(schedule));
    },
    [router],
  );
  return <TimerSettings onStart={open} onJoinGlobal={open} clock={clock} />;
}

function TimerSettings({
  clock = currentTimeMs,
  onStart,
  onJoinGlobal,
  running = false,
}: {
  readonly clock?: () => number;
  readonly onStart: (schedule: TimerSchedule) => void;
  readonly onJoinGlobal?: (schedule: TimerSchedule) => void;
  readonly running?: boolean;
}): JSX.Element {
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
    onStart({ ...durations, startMs: clock() });
  }, [durations, clock, onStart]);
  const joinGlobal = useCallback((): void => {
    onJoinGlobal?.({ ...durations, startMs: GLOBAL_START_MS });
  }, [onJoinGlobal, durations]);

  let fieldLayout = "grid gap-4";
  if (onJoinGlobal !== undefined) {
    fieldLayout += " sm:grid-cols-2";
  }
  const fields = (
    <div className={fieldLayout}>
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
  );
  if (onJoinGlobal === undefined) {
    let label: string = TIMER_COPY.start;
    if (running === true) {
      label = TIMER_COPY.startAgain;
    }
    return (
      <div className="flex flex-col gap-3">
        {fields}
        <Button onClick={start}>{label}</Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-5">
      {fields}
      <div className="ornamented-divider" aria-hidden="true">
        <span className="ornament" data-ornament="divider" />
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

export { TimerSettings, TimerSetup };
