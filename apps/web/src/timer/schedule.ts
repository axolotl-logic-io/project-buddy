// A timer schedule: work and break periods that repeat forever from a fixed
// start instant. A schedule is immutable and is all a timer link holds, so
// anyone who opens the same link follows the same periods. The phase is
// worked out from the time elapsed since the start, never from counted
// ticks, so a refresh, a late join or a sleeping device shows the current
// phase without replaying the ones it missed.
import type { Route } from "next";
import { z } from "zod";

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const MS_PER_MINUTE: number = MS_PER_SECOND * SECONDS_PER_MINUTE;
const SECONDS_PER_HOUR: number = SECONDS_PER_MINUTE * MINUTES_PER_HOUR;

// The preset lengths, in minutes, named where the name says more.
const QUARTER_HOUR = 15;
const POMODORO = 25;
const HALF_HOUR = 30;
const THREE_QUARTER_HOUR = 45;
const DEFAULT_WORK_MINUTES = 50;
const DEFAULT_BREAK_MINUTES = 10;
const TWO_HOURS = 120;

// The lengths a period may have, in minutes. Links hold one of these only.
const TIMER_MINUTES = [
  DEFAULT_BREAK_MINUTES,
  QUARTER_HOUR,
  POMODORO,
  HALF_HOUR,
  THREE_QUARTER_HOUR,
  DEFAULT_WORK_MINUTES,
  MINUTES_PER_HOUR,
  TWO_HOURS,
] as const;
type TimerMinutes = (typeof TIMER_MINUTES)[number];

// The global timer's start: the Unix epoch. Everyone who joins the global
// timer with the same durations follows the same schedule.
const GLOBAL_START_MS = 0;

// How far ahead of the viewer's clock a start may be and still count as
// started now, for two devices whose clocks disagree a little. A start
// further ahead is a link to a schedule that hasn't begun, which a timer
// doesn't support.
const START_CLOCK_SKEW_MS: number = MS_PER_MINUTE;

// The path segments of a timer link: /timer/<work>/<break>/<start>.
const TIMER_PATH = "/timer";
const DIGITS = /^\d{1,15}$/u;

const MINUTES = z.coerce.number().pipe(z.literal(TIMER_MINUTES));

const SCHEDULE = z.object({
  workMinutes: MINUTES,
  breakMinutes: MINUTES,
  // Milliseconds since the Unix epoch, a whole number from 0.
  startMs: z.number().int().min(GLOBAL_START_MS).max(Number.MAX_SAFE_INTEGER),
});

type TimerSchedule = z.infer<typeof SCHEDULE>;

// The durations a schedule is set up with, without its start.
type TimerDurations = Pick<TimerSchedule, "workMinutes" | "breakMinutes">;

const DURATIONS: z.ZodType<TimerDurations, unknown> = SCHEDULE.pick({
  workMinutes: true,
  breakMinutes: true,
});

const DEFAULT_DURATIONS: TimerDurations = {
  workMinutes: DEFAULT_WORK_MINUTES,
  breakMinutes: DEFAULT_BREAK_MINUTES,
};

// Where a timer is at one instant: its phase, how long is left of it, and
// how much of it has passed, from 0 up to but not including 1. A schedule
// that starts further ahead than START_CLOCK_SKEW_MS has no phase yet.
type TimerPhase =
  | {
      readonly kind: "work" | "break";
      readonly remainingMs: number;
      readonly elapsedFraction: number;
    }
  | { readonly kind: "not-started" };

// The schedule a link's path segments name, or undefined unless they are
// exactly a preset work length, a preset break length and a start of
// digits. Anything else, such as a missing, negative, fractional or
// non-numeric value, names no schedule.
function parseTimerSchedule(segments: {
  readonly work: unknown;
  readonly break: unknown;
  readonly start: unknown;
}): TimerSchedule | undefined {
  const values = [segments.work, segments.break, segments.start];
  if (
    !values.every((value) => typeof value === "string" && DIGITS.test(value))
  ) {
    return undefined;
  }
  return SCHEDULE.safeParse({
    workMinutes: segments.work,
    breakMinutes: segments.break,
    startMs: Number(segments.start),
  }).data;
}

// Durations as a request or storage holds them, or undefined unless both
// are presets.
function parseTimerDurations(value: unknown): TimerDurations | undefined {
  return DURATIONS.safeParse(value).data;
}

// A schedule as a request holds it, or undefined unless it is one.
function parseTimerScheduleValue(value: unknown): TimerSchedule | undefined {
  return SCHEDULE.safeParse(value).data;
}

// The link that opens schedule.
function timerPath({
  workMinutes,
  breakMinutes,
  startMs,
}: TimerSchedule): Route {
  return `/timer/${workMinutes}/${breakMinutes}/${startMs}`;
}

// Where schedule is at nowMs. The work period runs from each cycle's start
// up to, not including, its length; the break runs from there up to, not
// including, the next cycle.
function timerPhaseAt(schedule: TimerSchedule, nowMs: number): TimerPhase {
  const workMs = schedule.workMinutes * MS_PER_MINUTE;
  const breakMs = schedule.breakMinutes * MS_PER_MINUTE;
  const elapsedMs = nowMs - schedule.startMs;
  if (elapsedMs < -START_CLOCK_SKEW_MS) {
    return { kind: "not-started" };
  }
  const intoCycle = Math.max(elapsedMs, 0) % (workMs + breakMs);
  if (intoCycle < workMs) {
    return {
      kind: "work",
      remainingMs: workMs - intoCycle,
      elapsedFraction: intoCycle / workMs,
    };
  }
  const intoBreak = intoCycle - workMs;
  return {
    kind: "break",
    remainingMs: breakMs - intoBreak,
    elapsedFraction: intoBreak / breakMs,
  };
}

// How long until the phase at nowMs next shows a different whole second.
function msUntilNextSecond(schedule: TimerSchedule, nowMs: number): number {
  const phase = timerPhaseAt(schedule, nowMs);
  if (phase.kind === "not-started") {
    return MS_PER_SECOND;
  }
  return phase.remainingMs % MS_PER_SECOND || MS_PER_SECOND;
}

// Two digits, with a leading zero.
function twoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

// Time left as a countdown shows it: MM:SS, or HH:MM:SS from an hour. A
// part second counts as a whole one, so a period shows its full length as
// it begins and 00:01 in its last second.
function formatRemaining(remainingMs: number): string {
  const totalSeconds = Math.ceil(Math.max(remainingMs, 0) / MS_PER_SECOND);
  const hours = Math.floor(totalSeconds / SECONDS_PER_HOUR);
  const minutes = Math.floor(
    (totalSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE,
  );
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  if (hours > 0) {
    return `${twoDigits(hours)}:${twoDigits(minutes)}:${twoDigits(seconds)}`;
  }
  return `${twoDigits(minutes)}:${twoDigits(seconds)}`;
}

// Time left in whole minutes, rounded up, for announcing a phase.
function remainingMinutes(remainingMs: number): number {
  return Math.ceil(Math.max(remainingMs, 0) / MS_PER_MINUTE);
}

export {
  DEFAULT_DURATIONS,
  formatRemaining,
  GLOBAL_START_MS,
  MINUTES_PER_HOUR,
  msUntilNextSecond,
  parseTimerDurations,
  parseTimerSchedule,
  parseTimerScheduleValue,
  remainingMinutes,
  TIMER_MINUTES,
  TIMER_PATH,
  type TimerDurations,
  type TimerMinutes,
  type TimerPhase,
  type TimerSchedule,
  timerPath,
  timerPhaseAt,
};
