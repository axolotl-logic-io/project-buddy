"use client";

import Link from "next/link";
import { type JSX, useCallback, useEffect, useId, useState } from "react";
import { rememberDurations } from "@/components/timer/remembered-durations.ts";
import { useTimerPresence } from "@/components/timer/use-timer-presence.ts";
import { Button } from "@/components/ui/button.tsx";
import { FormStatus, Notice } from "@/components/ui/form-message.tsx";
import type { TimerPresence } from "@/timer/presence.ts";
import {
  formatRemaining,
  msUntilNextSecond,
  TIMER_PATH,
  type TimerPhase,
  type TimerSchedule,
  timerPhaseAt,
} from "@/timer/schedule.ts";
import { TIMER_COPY } from "@/ui/copy/timer.ts";

// The ring's radius and circumference, in the SVG's 100-unit box.
const RING_RADIUS = 45;
const RING_LENGTH: number = 2 * Math.PI * RING_RADIUS;

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

// The phase as a ring that fills as it passes, with its name and the time
// left inside. The ring is decoration: the name and the time say it all.
function TimerFace({
  phase,
}: {
  readonly phase: Extract<TimerPhase, { kind: "work" | "break" }>;
}): JSX.Element {
  let arc = "stroke-primary";
  if (phase.kind === "break") {
    arc = "stroke-accent";
  }
  return (
    <div className="timer-face">
      <svg aria-hidden="true" className="timer-ring" viewBox="0 0 100 100">
        <circle
          className="fill-none stroke-line"
          cx="50"
          cy="50"
          r={RING_RADIUS}
          strokeWidth="6"
        />
        <circle
          className={`fill-none ${arc}`}
          cx="50"
          cy="50"
          r={RING_RADIUS}
          strokeDasharray={RING_LENGTH}
          strokeDashoffset={RING_LENGTH * (1 - phase.elapsedFraction)}
          strokeLinecap="round"
          strokeWidth="6"
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="timer-readout">
        <h2 className="timer-phase">{TIMER_COPY.phase(phase.kind)}</h2>
        <p
          aria-label={TIMER_COPY.remainingLabel}
          className="timer-countdown"
          role="timer"
        >
          {formatRemaining(phase.remainingMs)}
        </p>
      </div>
    </div>
  );
}

// What the page says of the others following the schedule.
function othersText(presence: TimerPresence | undefined): string {
  if (presence === undefined) {
    return TIMER_COPY.othersLoading;
  }
  if (presence.kind === "unavailable") {
    return TIMER_COPY.othersUnavailable;
  }
  if (presence.others === 0) {
    return TIMER_COPY.noOthers;
  }
  return TIMER_COPY.others(presence.others);
}

// Copies the page's link, and says whether it could.
function CopyLink(): JSX.Element {
  const [status, setStatus] = useState("");
  const copy = useCallback((): void => {
    navigator.clipboard.writeText(globalThis.location.href).then(
      () => setStatus(TIMER_COPY.copied),
      () => setStatus(TIMER_COPY.copyFailed),
    );
  }, []);
  return (
    <div className="flex flex-col gap-2">
      <Button className="self-start" onClick={copy} variant="secondary">
        {TIMER_COPY.copyLink}
      </Button>
      <FormStatus>{status}</FormStatus>
    </div>
  );
}

// A running timer: the schedule's current phase, the time left of it and
// a ring of its progress, kept to the browser's clock; how many others
// follow the same schedule; its link to share; and the way back to setup.
// It remembers the schedule's durations for setup in this tab. A schedule
// that hasn't started yet shows no countdown.
function TimerDisplay({
  schedule,
  clock = currentTimeMs,
}: {
  readonly schedule: TimerSchedule;
  // The current time in milliseconds since the epoch.
  readonly clock?: () => number;
}): JSX.Element {
  const now = useNow(schedule, clock);
  const presence = useTimerPresence(schedule);
  const othersId = useId();
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
  return (
    <div className="flex flex-col items-center gap-6">
      {phase === undefined && <div aria-hidden="true" className="timer-face" />}
      {phase !== undefined && <TimerFace phase={phase} />}
      <p className="sr-only" role="status">
        {phase !== undefined && TIMER_COPY.phaseStarted(phase.kind)}
      </p>
      <section aria-labelledby={othersId} className="timer-details">
        <h2 className="section-heading" id={othersId}>
          {TIMER_COPY.othersHeading}
        </h2>
        <p className="text-muted">{othersText(presence)}</p>
        <p className="text-muted">{TIMER_COPY.shareHint}</p>
        <CopyLink />
        <Button asChild={true} className="self-start" variant="quiet">
          <Link href={TIMER_PATH}>{TIMER_COPY.change}</Link>
        </Button>
      </section>
    </div>
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
