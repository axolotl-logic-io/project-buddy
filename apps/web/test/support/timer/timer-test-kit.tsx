// For the timer's browser tests, at every level: a running timer or its
// setup rendered with a clock the test sets, and the tab brought back into
// view, which makes the timer read the clock again. The test file mocks
// next/navigation with timer-router.ts, and vitest.browser-setup.ts mocks
// the presence action.
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { TimerDisplay } from "@/components/timer/timer-display.tsx";
import { TimerSetup } from "@/components/timer/timer-setup.tsx";
import { TimerTrailTools } from "@/components/timer/timer-trail-tools.tsx";
import type { TimerSchedule } from "@/timer/schedule.ts";

const MS_PER_MINUTE = 60_000;

// 15 November 2026, 09:00 UTC: when the tests' timers start.
const T: number = Date.parse("2026-11-15T09:00:00Z");

// The time the rendered timer reads, which the test moves.
const clock: { now: number } = { now: T };

function readClock(): number {
  return clock.now;
}

// The setup, reading the test's clock.
async function renderSetup(): Promise<void> {
  await render(<TimerSetup clock={readClock} />);
}

// The schedule running, with the clock at nowMs, and the trail band's
// tools for it.
async function renderTimer(
  schedule: TimerSchedule,
  nowMs: number = schedule.startMs,
): Promise<{ unmount: () => Promise<void> }> {
  clock.now = nowMs;
  const screen = await render(
    <>
      <TimerTrailTools schedule={schedule} />
      <TimerDisplay clock={readClock} schedule={schedule} />
    </>,
  );
  return { unmount: (): Promise<void> => Promise.resolve(screen.unmount()) };
}

// Sets the clock to nowMs and brings the tab back into view, as when a
// background tab or a sleeping device returns.
function returnToTabAt(nowMs: number): void {
  clock.now = nowMs;
  document.dispatchEvent(new Event("visibilitychange"));
}

// The time minutes after the start of schedule.
function minutesAfter(schedule: TimerSchedule, minutes: number): number {
  return schedule.startMs + minutes * MS_PER_MINUTE;
}

// The running timer's phase name, as shown.
function phaseHeading(name: string): ReturnType<typeof page.getByRole> {
  return page.getByRole("heading", { level: 2, name, exact: true });
}

// The running timer's countdown, as shown.
function countdown(): ReturnType<typeof page.getByRole> {
  return page.getByRole("timer", { name: "Time left" });
}

// How much of the ring's arc is drawn, from 0 to 1, as the user sees it.
function ringDrawn(): number {
  const arcs = document.querySelectorAll("svg circle");
  const arc = arcs.item(arcs.length - 1);
  const length = Number(arc.getAttribute("stroke-dasharray"));
  const offset = Number(arc.getAttribute("stroke-dashoffset"));
  return 1 - offset / length;
}

export {
  countdown,
  minutesAfter,
  phaseHeading,
  renderSetup,
  renderTimer,
  returnToTabAt,
  ringDrawn,
  T,
};
