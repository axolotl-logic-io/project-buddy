"use client";

import Link from "next/link";
import { type JSX, useEffect, useId, useState } from "react";
import { rememberDurations } from "@/components/timer/remembered-durations.ts";
import { TimerDial } from "@/components/timer/timer-dial.tsx";
import { TimerHourglass } from "@/components/timer/timer-hourglass.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Notice } from "@/components/ui/form-message.tsx";
import {
  formatRemaining,
  msUntilNextSecond,
  TIMER_PATH,
  type TimerPhase,
  type TimerSchedule,
  timerPhaseAt,
} from "@/timer/schedule.ts";
import { TIMER_COPY } from "@/ui/copy/timer.ts";

// Normalize progress so the site appearance can choose its dial radius.
const RING_RADIUS = 173;
const RING_LENGTH = 100;
const MS_PER_HOUR = 3_600_000;

// The current time in milliseconds since the epoch.
function currentTimeMs(): number {
  return Date.now();
}

// The time now, as clock tells it, kept current to the second the
// countdown shows: read again as each second of the schedule passes and as
// the tab comes back into view, so a tab that was in the background or a
// device that slept shows the current phase at once. Undefined until the
// page is in the browser, whose clock it follows.
function useNow(
  schedule: TimerSchedule,
  clock: () => number,
): number | undefined {
  const [now, setNow] = useState<number | undefined>();
  const { workMinutes, breakMinutes, startMs } = schedule;
  useEffect(() => {
    const periods = { workMinutes, breakMinutes, startMs };
    let timeout: ReturnType<typeof setTimeout> | undefined;
    function tick(): void {
      clearTimeout(timeout);
      const time = clock();
      setNow(time);
      timeout = setTimeout(tick, msUntilNextSecond(periods, time));
    }
    function tickWhenShown(): void {
      if (document.visibilityState === "visible") {
        tick();
      }
    }
    tick();
    document.addEventListener("visibilitychange", tickWhenShown);
    return (): void => {
      clearTimeout(timeout);
      document.removeEventListener("visibilitychange", tickWhenShown);
    };
  }, [workMinutes, breakMinutes, startMs, clock]);
  return now;
}

// The appearance chooses an hourglass or dial. Both illustrations follow
// the same phase; the shared name and countdown provide its accessible text.
function TimerFace({
  phase,
  upcoming,
}: {
  readonly upcoming?: number | undefined;
  readonly phase: Extract<TimerPhase, { kind: "work" | "break" }>;
}): JSX.Element {
  const giltId = useId();
  let arc = "timer-progress";
  if (phase.kind === "break") {
    arc += " timer-progress-rest";
  }
  let next = TIMER_COPY.next("break");
  if (phase.kind === "break") {
    next = TIMER_COPY.next("work");
  }
  if (upcoming !== undefined) {
    next = TIMER_COPY.nextWithMinutes(next, upcoming);
  }
  return (
    <div className="timer-face">
      <TimerHourglass elapsedFraction={phase.elapsedFraction} />
      <svg aria-hidden="true" className="timer-ring" viewBox="0 0 420 420">
        <defs>
          <pattern
            id={giltId}
            width="12"
            height="12"
            patternUnits="userSpaceOnUse"
          >
            <rect className="timer-gilt" width="12" height="12" />
            <path
              className="timer-gilt-grain"
              d="M0 0 12 12M-6 6l12 12M6-6l12 12"
            />
          </pattern>
        </defs>
        <TimerDial elapsedFraction={phase.elapsedFraction} />
        <circle
          className="timer-track"
          cx="210"
          cy="210"
          r={RING_RADIUS}
          pathLength={RING_LENGTH}
        />
        <circle
          className={arc}
          stroke={`url(#${giltId})`}
          cx="210"
          cy="210"
          r={RING_RADIUS}
          strokeDasharray={RING_LENGTH}
          strokeDashoffset={RING_LENGTH * (1 - phase.elapsedFraction)}
          pathLength={RING_LENGTH}
          transform="rotate(-90 210 210)"
        />
      </svg>
      <div className="timer-readout">
        <div className="timer-value">
          <h2 className="timer-phase">{TIMER_COPY.phase(phase.kind)}</h2>
          <p
            aria-label={TIMER_COPY.remainingLabel}
            className="timer-countdown"
            data-hours={phase.remainingMs >= MS_PER_HOUR}
            role="timer"
          >
            {formatRemaining(phase.remainingMs)}
          </p>
        </div>
        <p className="timer-next">{next}</p>
      </div>
    </div>
  );
}

// A running timer: the schedule's current phase, the time left of it and
// its progress, kept to the browser's clock. The count of others
// and the preferences panel are in the trail band (timer-trail-tools.tsx). It
// remembers the schedule's durations for setup in this tab. A schedule
// that hasn't started yet shows no countdown.
function TimerDisplay({
  schedule,
  clock = currentTimeMs,
  showNextDuration = false,
}: {
  readonly schedule: TimerSchedule;
  readonly showNextDuration?: boolean;
  // The current time in milliseconds since the epoch.
  readonly clock?: () => number;
}): JSX.Element {
  const now = useNow(schedule, clock);
  const { workMinutes, breakMinutes } = schedule;

  useEffect(() => {
    rememberDurations({ workMinutes, breakMinutes });
  }, [workMinutes, breakMinutes]);

  let phase: TimerPhase | undefined;
  if (now !== undefined) {
    phase = timerPhaseAt(schedule, now);
  }
  if (phase?.kind === "not-started") {
    return <InvalidTimer />;
  }
  let upcoming: number | undefined;
  if (showNextDuration === true && phase !== undefined) {
    upcoming = breakMinutes;
    if (phase.kind === "break") {
      upcoming = workMinutes;
    }
  }
  return (
    <section aria-label={TIMER_COPY.displayLabel} className="timer-stage">
      {phase === undefined && <div aria-hidden="true" className="timer-face" />}
      {phase !== undefined && <TimerFace phase={phase} upcoming={upcoming} />}
      <p className="sr-only" role="status">
        {phase !== undefined && TIMER_COPY.phaseStarted(phase.kind)}
      </p>
    </section>
  );
}

// What a timer link shows when it names no schedule the site can show:
// why, and the way to set up a timer.
function InvalidTimer(): JSX.Element {
  return (
    <div className="flex flex-col items-start gap-4">
      <h2 className="section-heading">{TIMER_COPY.invalidHeading}</h2>
      <Notice>{TIMER_COPY.invalid}</Notice>
      <Button asChild={true}>
        <Link href={TIMER_PATH}>{TIMER_COPY.invalidAction}</Link>
      </Button>
    </div>
  );
}

export { InvalidTimer, TimerDisplay };
