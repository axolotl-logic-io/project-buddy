import { parse, wcagContrast } from "culori";
import { afterEach, beforeAll, beforeEach, expect, test, vi } from "vitest";
import { commands, page, userEvent } from "vitest/browser";
import { THEME_MODES } from "@/themes/themes.ts";
import { SITE_PANEL_COPY } from "@/ui/copy/site.ts";
import { THEME_COPY } from "@/ui/copy/theme.ts";
import { TIMER_COPY } from "@/ui/copy/timer.ts";
import { tabForward } from "../../../support/keyboard-test-kit.ts";
import {
  countdown,
  minutesAfter,
  openTimerPreferences,
  phaseHeading,
  progressColor,
  renderTimer,
  returnToTabAt,
  sand,
  sandHeight,
  T,
  timerIllustration,
  timerStage,
} from "../../../support/timer/timer-test-kit.tsx";
import { applyTheme } from "../../themes/theme-test-kit.ts";

vi.mock(
  "next/navigation",
  () => import("../../../support/timer/timer-router.ts"),
);

beforeAll(() => commands.serveAppearancePreference());

beforeEach(() => {
  applyTheme("parchment");
});

afterEach(async () => {
  await globalThis.cookieStore?.delete("theme");
});

const SCHEDULE = { workMinutes: 50, breakMinutes: 10, startMs: T } as const;
const PHONE_WIDTH = 320;
const DESKTOP_WIDTH = 1280;
const HEIGHT = 900;
const PARTWAY = 25;
const TWO_HOURS = 120;
const AA_TEXT_CONTRAST = 4.5;
const AA_GRAPHIC_CONTRAST = 3;

function preferences(): ReturnType<typeof page.getByRole> {
  return page.getByRole("dialog", { name: TIMER_COPY.preferences });
}

function selectedAppearance(name: string): ReturnType<typeof page.getByRole> {
  return page.getByRole("radio", { name });
}

async function selectSiteAppearance(name: string): Promise<void> {
  const label = selectedAppearance(name).element().closest("label");
  if (label === null) {
    throw new Error("The appearance choice has no label");
  }
  await userEvent.click(label);
}

test("use_case_timer_choose_appearance", async () => {
  await page.viewport(DESKTOP_WIDTH, HEIGHT);
  // A former timer-only preference must not override the shared appearance.
  localStorage.setItem("timer-appearance", "manuscript");
  const shown = await renderTimer(SCHEDULE, minutesAfter(SCHEDULE, PARTWAY));
  const initialInk = getComputedStyle(countdown().element()).color;
  await page
    .getByRole("button", { name: SITE_PANEL_COPY.title, exact: true })
    .click();
  await expect
    .element(selectedAppearance(THEME_COPY.modes.light))
    .toBeChecked();
  await selectSiteAppearance(THEME_COPY.modes["soot-brass"]);
  await expect
    .element(selectedAppearance(THEME_COPY.modes["soot-brass"]))
    .toBeChecked();
  expect(getComputedStyle(countdown().element()).color).not.toBe(initialInk);
  expect(getComputedStyle(countdown().element()).color).toBe(
    getComputedStyle(document.body).color,
  );
  await expect
    .poll(() => document.cookie.split("; "))
    .toContain("theme=parchment.soot-brass");
  await expect.element(countdown()).toHaveTextContent("25:00");
  await expect
    .element(page.getByText("Project Buddy · Timer", { exact: true }))
    .not.toBeInTheDocument();
  await shown.unmount();
  await renderTimer(SCHEDULE, minutesAfter(SCHEDULE, SCHEDULE.workMinutes));
  await expect
    .element(selectedAppearance(THEME_COPY.modes["soot-brass"]))
    .toBeChecked();
  await expect.element(phaseHeading("Break")).toBeVisible();
  await expect.element(countdown()).toHaveTextContent("10:00");
});

test("use_case_timer_copy_link", async () => {
  await page.viewport(DESKTOP_WIDTH, HEIGHT);
  await renderTimer(SCHEDULE);
  await expect
    .element(page.getByRole("button", { name: TIMER_COPY.copyLink }))
    .not.toBeInTheDocument();
  await openTimerPreferences();
  await expect
    .element(preferences().getByRole("radio"))
    .not.toBeInTheDocument();
  const copy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
  await preferences()
    .getByRole("button", { name: TIMER_COPY.copyLink })
    .click();
  expect(copy).toHaveBeenCalledWith(globalThis.location.href);
  await expect
    .element(
      preferences().getByRole("button", { name: TIMER_COPY.copiedLabel }),
    )
    .toBeVisible();
  copy.mockRejectedValue(new Error("Clipboard denied"));
  await preferences()
    .getByRole("button", { name: TIMER_COPY.copiedLabel })
    .click();
  await expect
    .element(
      preferences().getByRole("button", { name: TIMER_COPY.copyFailedLabel }),
    )
    .toBeVisible();
  await expect
    .element(preferences().getByRole("status"))
    .toHaveTextContent(TIMER_COPY.copyFailed);
  await expect.element(countdown()).toBeVisible();
});

test("the phone drawer traps focus, closes with Escape, and restores focus", async () => {
  await commands.reduceMotion();
  await page.viewport(PHONE_WIDTH, HEIGHT);
  await renderTimer(SCHEDULE);
  await openTimerPreferences();
  const close = preferences().getByRole("button", {
    name: TIMER_COPY.closePreferences,
  });
  await expect.element(close).toHaveFocus();
  preferences()
    .getByRole("button", { name: TIMER_COPY.copyLink })
    .element()
    .focus();
  await tabForward();
  await expect.element(close).toHaveFocus();
  await userEvent.keyboard("{Escape}");
  await expect.element(preferences()).not.toBeInTheDocument();
  await expect
    .element(
      page.getByRole("button", { name: TIMER_COPY.preferences, exact: true }),
    )
    .toHaveFocus();
});

test.each(THEME_MODES)(
  "%s fits on phones in work, break, and hour-long periods",
  async (mode) => {
    await commands.reduceMotion();
    await page.viewport(PHONE_WIDTH, HEIGHT);
    const longSchedule = { ...SCHEDULE, workMinutes: TWO_HOURS } as const;
    applyTheme("parchment", mode);
    await renderTimer(longSchedule);
    await openTimerPreferences();
    // The illustration sits on the page's own texture and adds no second
    // paper surface (docs/timer.md).
    expect(
      parse(getComputedStyle(timerStage()).backgroundColor)?.alpha,
      "the timer's stage paints no surface of its own",
    ).toBe(0);
    const paper = backdrop(timerStage());
    for (const element of [
      countdown().element(),
      phaseHeading("Work").element(),
      page.getByText(TIMER_COPY.next("break"), { exact: true }).element(),
    ]) {
      expect(
        wcagContrast(getComputedStyle(element).color, paper),
      ).toBeGreaterThanOrEqual(AA_TEXT_CONTRAST);
    }
    expect(wcagContrast(progressColor(), paper)).toBeGreaterThanOrEqual(
      AA_GRAPHIC_CONTRAST,
    );
    await userEvent.keyboard("{Escape}");
    await expect.element(countdown()).toHaveTextContent("02:00:00");
    const bounds = countdown().element().getBoundingClientRect();
    const circle = timerIllustration().getBoundingClientRect();
    const centerX = bounds.left + bounds.width / 2;
    expect(centerX).toBeCloseTo(circle.left + circle.width / 2, 0);
    expect(bounds.left).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(PHONE_WIDTH);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      PHONE_WIDTH,
    );
    returnToTabAt(minutesAfter(longSchedule, TWO_HOURS));
    await expect.element(phaseHeading("Break")).toBeVisible();
    await expect.element(countdown()).toHaveTextContent("10:00");
  },
);

// The colour behind `element`: the first background colour on it or an
// element it sits in, or the page's paper under any texture.
function backdrop(element: Element): string {
  for (
    let current: Element | null = element;
    current !== null;
    current = current.parentElement
  ) {
    const color = getComputedStyle(current).backgroundColor;
    if (parse(color)?.alpha !== 0) {
      return color;
    }
  }
  return getComputedStyle(document.documentElement).getPropertyValue(
    "--background",
  );
}

// How a marker is drawn: the paint, opacity and filter of it and each shape
// in it, so a lit marker differs from an unlit one however it is lit.
function drawing(marker: Element): string {
  return [marker, ...marker.querySelectorAll("*")]
    .map((part) => {
      const style = getComputedStyle(part);
      return [
        style.color,
        style.fill,
        style.stroke,
        style.opacity,
        style.filter,
      ].join(" ");
    })
    .join("|");
}

// How many of the dial's markers are drawn lit: like the first, which the
// arc has passed from the period's start. The dial marks each with
// data-passed (timer-dial.tsx).
function litMarkers(): number {
  const markers = [...timerStage().querySelectorAll("[data-passed]")];
  const first = markers.at(0);
  if (first === undefined) {
    throw new Error("The dial has no markers marked data-passed");
  }
  const lit = drawing(first);
  return markers.filter((marker) => drawing(marker) === lit).length;
}

test.each(["soot-brass", "dark"] as const)(
  "%s lights symbols as the arc passes them and resets with the next period",
  async (mode) => {
    await commands.reduceMotion();
    applyTheme("parchment", mode);
    await page.viewport(PHONE_WIDTH, HEIGHT);
    await renderTimer(SCHEDULE);
    const dialBounds = timerIllustration().getBoundingClientRect();
    const timeBounds = countdown().element().getBoundingClientRect();
    expect(timeBounds.top + timeBounds.height / 2).toBeCloseTo(
      dialBounds.top + dialBounds.height / 2,
      0,
    );
    expect(litMarkers()).toBe(1);
    returnToTabAt(minutesAfter(SCHEDULE, PARTWAY));
    await expect.element(countdown()).toHaveTextContent("25:00");
    const HalfDial = 7;
    expect(litMarkers()).toBe(HalfDial);
    returnToTabAt(minutesAfter(SCHEDULE, SCHEDULE.workMinutes));
    await expect.element(phaseHeading("Break")).toBeVisible();
    expect(litMarkers()).toBe(1);
  },
);

test("the hourglass drains, fills, and resets with the next period", async () => {
  await page.viewport(PHONE_WIDTH, HEIGHT);
  await renderTimer(SCHEDULE);
  const { top, bottom } = sand();
  expect(countdown().element().getBoundingClientRect().top).toBeGreaterThan(
    timerIllustration().getBoundingClientRect().bottom,
  );
  const fullTop = sandHeight(top);
  expect(fullTop).toBeGreaterThan(0);
  expect(sandHeight(bottom)).toBe(0);
  returnToTabAt(minutesAfter(SCHEDULE, PARTWAY));
  await expect.element(countdown()).toHaveTextContent("25:00");
  expect(sandHeight(top)).toBeCloseTo(fullTop / 2);
  const halfBottom = sandHeight(bottom);
  expect(halfBottom).toBeGreaterThan(0);
  returnToTabAt(minutesAfter(SCHEDULE, SCHEDULE.workMinutes - 1));
  await expect.element(countdown()).toHaveTextContent("01:00");
  expect(sandHeight(top)).toBeLessThan(fullTop / 2);
  expect(sandHeight(bottom)).toBeGreaterThan(halfBottom);
  returnToTabAt(minutesAfter(SCHEDULE, SCHEDULE.workMinutes));
  await expect.element(phaseHeading("Break")).toBeVisible();
  expect(sandHeight(top)).toBe(fullTop);
  expect(sandHeight(bottom)).toBe(0);
  returnToTabAt(
    minutesAfter(SCHEDULE, SCHEDULE.workMinutes + SCHEDULE.breakMinutes / 2),
  );
  await expect.element(countdown()).toHaveTextContent("05:00");
  expect(sandHeight(top)).toBeCloseTo(fullTop / 2);
  expect(sandHeight(bottom)).toBeCloseTo(halfBottom);
});

test.each([
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 390, height: 667 },
])(
  "the hourglass readout fits a short $width × $height phone",
  async ({ width, height }) => {
    await page.viewport(width, height);
    await renderTimer(SCHEDULE, minutesAfter(SCHEDULE, PARTWAY));
    const next = page
      .getByText(TIMER_COPY.next("break"), { exact: true })
      .element();
    const time = countdown().element();
    const edgeSpace = 16;
    const readableNumberSize = 64;
    expect(time.getBoundingClientRect().top).toBeGreaterThanOrEqual(0);
    expect(time.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      height - edgeSpace,
    );
    expect(next.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      height - edgeSpace,
    );
    expect(
      Number.parseFloat(getComputedStyle(time).fontSize),
    ).toBeGreaterThanOrEqual(readableNumberSize);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  },
);
