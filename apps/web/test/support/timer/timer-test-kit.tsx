// For the timer's browser tests, at every level: a running timer or its
// setup rendered with a clock the test sets, and the tab brought back into
// view, which makes the timer read the clock again. The test file mocks
// next/navigation with timer-router.ts, and vitest.browser-setup.ts mocks
// the presence action.
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { SiteHeader, TrailBand } from "@/components/site-header.tsx";
import { TimerDisplay } from "@/components/timer/timer-display.tsx";
import { TimerSetup } from "@/components/timer/timer-setup.tsx";
import { TimerTrailTools } from "@/components/timer/timer-trail-tools.tsx";
import type { TimerSchedule } from "@/timer/schedule.ts";
import { TIMER_COPY } from "@/ui/copy/timer.ts";

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
// tools for it, as a signed-in user sees them unless signedIn is false.
async function renderTimer(
  schedule: TimerSchedule,
  nowMs: number = schedule.startMs,
  { signedIn = true }: { readonly signedIn?: boolean } = {},
): Promise<{ unmount: () => Promise<void> }> {
  clock.now = nowMs;
  const screen = await render(
    <>
      <SiteHeader
        trail={
          <TrailBand
            items={[
              {
                label: TIMER_COPY.scheduleName(
                  schedule.workMinutes,
                  schedule.breakMinutes,
                ),
                action: (
                  <TimerTrailTools schedule={schedule} signedIn={signedIn} />
                ),
              },
            ]}
          />
        }
      />
      <TimerDisplay clock={readClock} schedule={schedule} />
    </>,
  );
  return { unmount: (): Promise<void> => Promise.resolve(screen.unmount()) };
}

async function openTimerPreferences(): Promise<void> {
  await page
    .getByRole("button", { name: TIMER_COPY.preferences, exact: true })
    .click();
  const dialog = page
    .getByRole("dialog", { name: TIMER_COPY.preferences })
    .element();
  await Promise.all(
    dialog.getAnimations().map((animation) => animation.finished),
  );
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

// The fraction shown by the visible illustration, measured from its geometry.
function progressShown(): number {
  const visible = [...document.querySelectorAll("svg")].filter(
    (svg) => svg.getBoundingClientRect().width > 0,
  );
  for (const svg of visible) {
    const sand = svg.querySelector("rect[data-sand-top]");
    const bowl = svg.querySelector("clipPath path");
    if (sand instanceof SVGRectElement && bowl instanceof SVGPathElement) {
      return 1 - sand.height.baseVal.value / bowl.getBBox().height;
    }
    const arc = svg.querySelector("circle[stroke-dasharray]");
    if (arc !== null) {
      const length = Number(arc.getAttribute("stroke-dasharray"));
      const offset = Number(arc.getAttribute("stroke-dashoffset"));
      return 1 - offset / length;
    }
  }
  throw new Error("The timer has no visible progress illustration");
}

export {
  countdown,
  minutesAfter,
  openTimerPreferences,
  phaseHeading,
  progressShown,
  renderSetup,
  renderTimer,
  returnToTabAt,
  T,
};
