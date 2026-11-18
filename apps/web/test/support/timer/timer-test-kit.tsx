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
import { animationsSettled } from "../animations-test-kit.ts";
import {
  drawsArc,
  filledFraction,
  progressArc,
} from "../progress-arc-test-kit.ts";

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
  await animationsSettled(dialog, "The timer's preferences");
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

// The running timer's stage, which holds its illustration.
function timerStage(): Element {
  return page.getByRole("region", { name: TIMER_COPY.displayLabel }).element();
}

// Whether the page draws `element`: it isn't hidden and has a size.
function drawn(element: Element): boolean {
  const box = element.getBoundingClientRect();
  return box.width > 0 && box.height > 0;
}

// The hourglass's sand, which the tests read its progress from: the shapes
// timer-hourglass.tsx marks data-sand-top and data-sand-bottom, whatever
// they are drawn with.
interface Sand {
  readonly top: SVGGraphicsElement;
  readonly bottom: SVGGraphicsElement;
}

// The hourglass's sand, if the appearance shows an hourglass.
function shownSand(): Sand | undefined {
  const stage = timerStage();
  const top = stage.querySelector("[data-sand-top]");
  const bottom = stage.querySelector("[data-sand-bottom]");
  if (
    !(
      top instanceof SVGGraphicsElement && bottom instanceof SVGGraphicsElement
    ) ||
    top.ownerSVGElement === null ||
    !drawn(top.ownerSVGElement)
  ) {
    return undefined;
  }
  return { top, bottom };
}

// The hourglass's sand; throws if the appearance shows none.
function sand(): Sand {
  const shown = shownSand();
  if (shown === undefined) {
    throw new Error(
      "The timer shows no hourglass sand (the shapes marked data-sand-top and data-sand-bottom)",
    );
  }
  return shown;
}

// How tall a bowl's sand is drawn, in the hourglass's units.
function sandHeight(bowl: SVGGraphicsElement): number {
  return bowl.getBBox().height;
}

const CLIP_REFERENCE = /url\(["']?#(?<id>[^"')]+)["']?\)/u;

// The element a url(#id) paint or clip-path names, or null.
function referenced(value: string): Element | null {
  const { groups: { id = "" } = {} } = CLIP_REFERENCE.exec(value) ?? {};
  if (id === "") {
    return null;
  }
  return document.querySelector(`#${CSS.escape(id)}`);
}

// How tall the top bowl is: the shape its sand is clipped to.
function bowlHeight(top: SVGGraphicsElement): number {
  const shape = referenced(getComputedStyle(top).clipPath)?.firstElementChild;
  if (!(shape instanceof SVGGraphicsElement)) {
    throw new Error(
      "The hourglass's top sand isn't clipped to its bowl's shape; update how timer-test-kit.tsx measures a full bowl",
    );
  }
  return shape.getBBox().height;
}

// The illustration the appearance shows: the hourglass, or the dial with
// its dashed progress arc.
function timerIllustration(): SVGSVGElement {
  const shown = shownSand()?.top.ownerSVGElement;
  if (shown !== undefined && shown !== null) {
    return shown;
  }
  const dial = progressArc(timerStage(), "The timer's dial").ownerSVGElement;
  if (dial === null) {
    throw new Error("The timer's progress arc is outside an illustration");
  }
  return dial;
}

// The fraction of the period the illustration shows as passed: how much of
// the top bowl has drained, or how much of the dial's arc is filled.
function progressShown(): number {
  const shown = shownSand();
  if (shown !== undefined) {
    return 1 - sandHeight(shown.top) / bowlHeight(shown.top);
  }
  const stage = timerStage();
  if (drawsArc(stage)) {
    return filledFraction(stage, "The timer's dial");
  }
  throw new Error(
    "The timer shows neither an hourglass's sand (data-sand-top) nor a dial's dashed arc",
  );
}

// The colour the illustration paints its progress with: the sand's, or the
// arc's stroke. A pattern's paint is the colour of the first shape it draws.
function progressColor(): string {
  const shown = shownSand();
  let paint = "";
  if (shown === undefined) {
    paint = getComputedStyle(
      progressArc(timerStage(), "The timer's dial"),
    ).stroke;
  } else {
    paint = getComputedStyle(shown.top).fill;
  }
  const pattern = referenced(paint);
  if (pattern === null) {
    return paint;
  }
  const shape = [...pattern.children].find(
    (child) => child instanceof SVGGeometryElement,
  );
  if (shape === undefined) {
    throw new Error(`The timer's progress paint (${paint}) draws no shape`);
  }
  return getComputedStyle(shape).fill;
}

export {
  countdown,
  minutesAfter,
  openTimerPreferences,
  phaseHeading,
  progressColor,
  progressShown,
  renderSetup,
  renderTimer,
  returnToTabAt,
  sand,
  sandHeight,
  T,
  timerIllustration,
  timerStage,
};
