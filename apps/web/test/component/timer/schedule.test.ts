// The timer's schedule arithmetic: phases from elapsed time at exact
// boundaries and after long gaps, the countdown's format, and which link
// values name a schedule.
import { describe, expect, test } from "vitest";
import {
  formatRemaining,
  isTimerPath,
  msUntilNextSecond,
  parseTimerSchedule,
  type TimerSchedule,
  timerPath,
  timerPhaseAt,
} from "@/timer/schedule.ts";

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60_000;
const T = Date.parse("2026-11-15T09:00:00Z");
const WORK = 50;
const BREAK = 10;
const CYCLE: number = WORK + BREAK;
const FIFTY_TEN: TimerSchedule = {
  workMinutes: WORK,
  breakMinutes: BREAK,
  startMs: T,
};
// Minutes into a period, for a phase seen partway through.
const PARTWAY = 5;
// Three years of 60-minute cycles.
const CYCLES_IN_THREE_YEARS = 26_280;
const QUARTER_SECOND_MS = 250;
const HALF_MINUTE_MS = 30_000;
const HOUR_MS = 3_600_000;

// The schedule's phase the given minutes after its start.
function at(
  minutes: number,
  schedule = FIFTY_TEN,
): ReturnType<typeof timerPhaseAt> {
  return timerPhaseAt(schedule, schedule.startMs + minutes * MS_PER_MINUTE);
}

describe("a timer's phase", () => {
  test("starts with the whole work period", () => {
    expect(at(0)).toEqual({
      kind: "work",
      remainingMs: WORK * MS_PER_MINUTE,
      elapsedFraction: 0,
    });
  });

  test("enters a full break at exactly the end of work", () => {
    expect(at(WORK)).toEqual({
      kind: "break",
      remainingMs: BREAK * MS_PER_MINUTE,
      elapsedFraction: 0,
    });
    expect(timerPhaseAt(FIFTY_TEN, T + WORK * MS_PER_MINUTE - 1)).toMatchObject(
      { kind: "work", remainingMs: 1 },
    );
  });

  test("enters a full work period at exactly the end of each cycle", () => {
    expect(at(CYCLE)).toEqual({
      kind: "work",
      remainingMs: WORK * MS_PER_MINUTE,
      elapsedFraction: 0,
    });
    expect(at(CYCLE * BREAK)).toMatchObject({
      kind: "work",
      elapsedFraction: 0,
    });
  });

  test("is where the schedule is after missed periods, however many", () => {
    expect(at(2 * CYCLE + PARTWAY)).toMatchObject({
      kind: "work",
      remainingMs: (WORK - PARTWAY) * MS_PER_MINUTE,
    });
    expect(at(CYCLES_IN_THREE_YEARS * CYCLE + WORK + PARTWAY)).toMatchObject({
      kind: "break",
      remainingMs: (BREAK - PARTWAY) * MS_PER_MINUTE,
      elapsedFraction: PARTWAY / BREAK,
    });
  });

  test("of the global timer is aligned to the epoch for its durations", () => {
    const global = { workMinutes: 25, breakMinutes: 15, startMs: 0 } as const;
    const globalCycle = global.workMinutes + global.breakMinutes;
    expect(at(global.workMinutes + PARTWAY, global)).toMatchObject({
      kind: "break",
      remainingMs: (global.breakMinutes - PARTWAY) * MS_PER_MINUTE,
    });
    expect(timerPhaseAt(global, T)).toEqual(
      timerPhaseAt(global, T + globalCycle * MS_PER_MINUTE),
    );
  });

  test("counts a start a little ahead of the clock as now, and one further ahead as not started", () => {
    expect(timerPhaseAt(FIFTY_TEN, T - HALF_MINUTE_MS)).toEqual(at(0));
    expect(timerPhaseAt(FIFTY_TEN, T - 2 * MS_PER_MINUTE)).toEqual({
      kind: "not-started",
    });
  });

  test("next shows a new second when its remaining time crosses one", () => {
    expect(msUntilNextSecond(FIFTY_TEN, T)).toBe(MS_PER_SECOND);
    expect(msUntilNextSecond(FIFTY_TEN, T + QUARTER_SECOND_MS)).toBe(
      MS_PER_SECOND - QUARTER_SECOND_MS,
    );
  });
});

describe("a timer's countdown", () => {
  test.each([
    { remainingMs: WORK * MS_PER_MINUTE, shown: "50:00" },
    { remainingMs: 2 * HOUR_MS, shown: "02:00:00" },
    { remainingMs: 60 * MS_PER_MINUTE, shown: "01:00:00" },
    { remainingMs: HOUR_MS - 1, shown: "01:00:00" },
    { remainingMs: 1, shown: "00:01" },
    { remainingMs: 0, shown: "00:00" },
    { remainingMs: -5, shown: "00:00" },
  ])("shows $remainingMs ms as $shown", ({ remainingMs, shown }) => {
    expect(formatRemaining(remainingMs)).toBe(shown);
  });
});

describe("a timer link", () => {
  test("names the schedule of its preset durations and start", () => {
    expect(
      parseTimerSchedule({ work: "25", break: "15", start: String(T) }),
    ).toEqual({ workMinutes: 25, breakMinutes: 15, startMs: T });
    expect(parseTimerSchedule({ work: "50", break: "10", start: "0" })).toEqual(
      { workMinutes: 50, breakMinutes: 10, startMs: 0 },
    );
    expect(timerPath({ workMinutes: 25, breakMinutes: 15, startMs: T })).toBe(
      `/timer/25/15/${T}`,
    );
  });

  test.each([
    { work: undefined, break: "10", start: "0" },
    { work: "50", break: "10", start: "" },
    { work: "50", break: "10", start: undefined },
    { work: "0", break: "10", start: "0" },
    { work: "-50", break: "10", start: "0" },
    { work: "50", break: "-10", start: "0" },
    { work: "50", break: "11", start: "0" },
    { work: "50.0", break: "10", start: "0" },
    { work: "NaN", break: "10", start: "0" },
    { work: "Infinity", break: "10", start: "0" },
    { work: "50", break: "10", start: "-1" },
    { work: "50", break: "10", start: "1e12" },
    { work: "50", break: "10", start: "90071992547409910" },
    { work: ["50"], break: "10", start: "0" },
  ])(
    "names no schedule with work $work, break $break and start $start",
    (values) => {
      expect(parseTimerSchedule(values)).toBeUndefined();
    },
  );

  test("is told apart from other paths for signing in", () => {
    expect(isTimerPath(`/timer/25/15/${T}`)).toBe(true);
    expect(isTimerPath("/timer")).toBe(false);
    expect(isTimerPath("/timer/25/15")).toBe(false);
    expect(isTimerPath("/timer/25/16/0")).toBe(false);
    expect(isTimerPath("/timer/25/15/0/more")).toBe(false);
    expect(isTimerPath("/quests/25/15/0")).toBe(false);
  });
});
