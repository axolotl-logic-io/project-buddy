// Feature: Visual work and break timer (#987). One test for each of the
// issue's scenarios that the browser shows, in Chromium and WebKit, with a
// clock the test sets. visual-timer.server.test.ts has the ones the server
// decides.
import { beforeEach, describe, expect, test, vi } from "vitest";
import { commands, page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import InvalidTimerPage from "@/app/(workspace)/timer/[...invalid]/page.tsx";
import TimerPage from "@/app/(workspace)/timer/[work]/[break]/[start]/page.tsx";
import { TimerDisplay } from "@/components/timer/timer-display.tsx";
import { TimerSetup } from "@/components/timer/timer-setup.tsx";
import { reportTimerPresenceAction } from "@/timer/presence-action.ts";
import {
  parseTimerSchedule,
  TIMER_MINUTES,
  type TimerSchedule,
} from "@/timer/schedule.ts";
import { TIMER_COPY } from "@/ui/copy/timer.ts";
import { tabForward } from "../../support/keyboard-test-kit.ts";
import { timerRouter } from "../../support/timer/timer-router.ts";
import {
  countdown,
  minutesAfter,
  phaseHeading,
  renderSetup,
  renderTimer,
  returnToTabAt,
  ringDrawn,
  T,
} from "../../support/timer/timer-test-kit.tsx";

vi.mock("next/navigation", () => import("../../support/timer/timer-router.ts"));
vi.mock("@/auth/current-user.ts", () => ({
  requireUser: vi.fn(() =>
    Promise.resolve({
      id: "00000000-0000-4000-8000-000000000001",
      email: "timer@example.test",
      role: "user",
      sessionEpoch: 0,
      name: "Wren",
      accountState: "signed_up",
    }),
  ),
}));

const WORK = 50;
const BREAK = 10;
const CYCLE: number = WORK + BREAK;
const FIFTY_TEN: TimerSchedule = {
  workMinutes: WORK,
  breakMinutes: BREAK,
  startMs: T,
};
const JOINED_AT = 55;
const REFRESHED_AT = 56;
const RESUMED_AT = 125;
const TWO_HOURS = 120;
const NARROWEST_PX = 320;
const PHONE_PX = 390;
const PHONE_HEIGHT = 700;
const OTHERS = 3;
const PHONE_LAYOUTS = [
  { colorScheme: "light", width: NARROWEST_PX },
  { colorScheme: "light", width: PHONE_PX },
  { colorScheme: "dark", width: NARROWEST_PX },
  { colorScheme: "dark", width: PHONE_PX },
] as const;

// The tests' start time, as a clock.
function startTime(): number {
  return T;
}

function workSelect(): ReturnType<typeof page.getByRole> {
  return page.getByRole("combobox", { name: TIMER_COPY.workLabel });
}

function breakSelect(): ReturnType<typeof page.getByRole> {
  return page.getByRole("combobox", { name: TIMER_COPY.breakLabel });
}

// The options a duration selector offers, in minutes.
function offeredMinutes(select: Element): number[] {
  return [...select.querySelectorAll("option")].map((option) =>
    Number(option.value),
  );
}

beforeEach(() => {
  sessionStorage.clear();
  timerRouter.push.mockReset();
  vi.mocked(reportTimerPresenceAction).mockResolvedValue({
    kind: "count",
    others: 0,
  });
});

describe("Feature: Visual work and break timer", () => {
  test("Scenario: Configure a fresh timer", async () => {
    await renderSetup();

    await expect.element(workSelect()).toHaveValue(String(WORK));
    await expect.element(breakSelect()).toHaveValue(String(BREAK));
    expect(offeredMinutes(workSelect().element())).toEqual([...TIMER_MINUTES]);
    expect(offeredMinutes(breakSelect().element())).toEqual([...TIMER_MINUTES]);
  });

  test("Scenario: Repeat at exact boundaries", async () => {
    await renderTimer(FIFTY_TEN);

    returnToTabAt(minutesAfter(FIFTY_TEN, WORK));
    await expect.element(phaseHeading("Break")).toBeVisible();
    await expect.element(countdown()).toHaveTextContent("10:00");
    expect(ringDrawn()).toBe(0);

    returnToTabAt(minutesAfter(FIFTY_TEN, CYCLE));
    await expect.element(phaseHeading("Work")).toBeVisible();
    await expect.element(countdown()).toHaveTextContent("50:00");
    expect(ringDrawn()).toBe(0);
  });

  test("Scenario: Join and refresh an existing schedule", async () => {
    const joined = await renderTimer(
      FIFTY_TEN,
      minutesAfter(FIFTY_TEN, JOINED_AT),
    );
    await expect.element(phaseHeading("Break")).toBeVisible();
    await expect.element(countdown()).toHaveTextContent("05:00");
    await joined.unmount();

    await renderTimer(FIFTY_TEN, minutesAfter(FIFTY_TEN, REFRESHED_AT));
    await expect.element(phaseHeading("Break")).toBeVisible();
    await expect.element(countdown()).toHaveTextContent("04:00");
    expect(reportTimerPresenceAction).toHaveBeenLastCalledWith(FIFTY_TEN);
  });

  test("Scenario: Join the global schedule", async () => {
    await renderSetup();
    await page.getByRole("button", { name: TIMER_COPY.joinGlobal }).click();
    returnToTabAt(minutesAfter(FIFTY_TEN, JOINED_AT));
    await page.getByRole("button", { name: TIMER_COPY.joinGlobal }).click();

    expect(timerRouter.push.mock.calls).toEqual([
      ["/timer/50/10/0"],
      ["/timer/50/10/0"],
    ]);

    await breakSelect().selectOptions("15");
    await page.getByRole("button", { name: TIMER_COPY.joinGlobal }).click();
    expect(timerRouter.push).toHaveBeenLastCalledWith("/timer/50/15/0");
  });

  test("Scenario: Return after missed periods", async () => {
    await renderTimer(FIFTY_TEN);
    await expect.element(phaseHeading("Work")).toBeVisible();

    returnToTabAt(minutesAfter(FIFTY_TEN, RESUMED_AT));
    await expect.element(phaseHeading("Work")).toBeVisible();
    await expect.element(countdown()).toHaveTextContent("45:00");
    await expect
      .element(page.getByRole("status").filter({ hasText: "Work time." }))
      .toBeInTheDocument();
  });

  test("Scenario: Display hours and accessible phase information", async () => {
    await renderTimer({
      workMinutes: TWO_HOURS,
      breakMinutes: BREAK,
      startMs: T,
    });

    await expect.element(countdown()).toHaveTextContent("02:00:00");
    await expect.element(phaseHeading("Work")).toBeVisible();
    // The countdown is a timer, which assistive technology doesn't read out
    // as it changes; only the phase's start is announced.
    await expect.element(countdown()).not.toHaveAttribute("aria-live");
    await expect.element(countdown()).toHaveTextContent("02:00:00");
    expect(
      page.getByRole("status").filter({ hasText: "Work time." }).element()
        .textContent,
    ).toBe("Work time.");
  });

  test("Scenario: Remember settings without changing existing timers", async () => {
    const shared = { workMinutes: 25, breakMinutes: 15, startMs: T } as const;
    const sharedLink = `/timer/25/15/${T}`;
    const shown = await renderTimer(shared);
    await shown.unmount();

    await renderSetup();
    await expect.element(workSelect()).toHaveValue("25");
    await expect.element(breakSelect()).toHaveValue("15");

    await workSelect().selectOptions("30");
    await breakSelect().selectOptions("10");
    await page.getByRole("button", { name: TIMER_COPY.start }).click();
    expect(timerRouter.push).toHaveBeenCalledWith(`/timer/30/10/${T}`);
    const [, , work, rest, start] = sharedLink.split("/");
    expect(parseTimerSchedule({ work, break: rest, start })).toEqual(shared);
  });

  test("Scenario: Continue through presence failure", async () => {
    vi.mocked(reportTimerPresenceAction).mockRejectedValueOnce(
      new Error("offline"),
    );
    await renderTimer(FIFTY_TEN);
    await expect
      .element(page.getByText(TIMER_COPY.othersUnavailable))
      .toBeVisible();

    returnToTabAt(minutesAfter(FIFTY_TEN, WORK));
    await expect.element(phaseHeading("Break")).toBeVisible();
    await expect.element(countdown()).toHaveTextContent("10:00");

    vi.mocked(reportTimerPresenceAction).mockResolvedValueOnce({
      kind: "count",
      others: OTHERS,
    });
    returnToTabAt(minutesAfter(FIFTY_TEN, WORK + 1));
    await expect
      .element(page.getByText(TIMER_COPY.others(OTHERS)))
      .toBeVisible();
  });

  test.each([
    { work: "50", break: "", start: "0" },
    { work: "fifty", break: "10", start: "0" },
    { work: "0", break: "10", start: "0" },
    { work: "-50", break: "10", start: "0" },
  ])("Scenario: Handle invalid links ($work/$break/$start)", async (params) => {
    await render(
      await TimerPage({
        params: Promise.resolve(params),
        searchParams: Promise.resolve({}),
      }),
    );

    await expect
      .element(page.getByRole("heading", { name: TIMER_COPY.invalidHeading }))
      .toBeVisible();
    await expect
      .element(page.getByRole("link", { name: TIMER_COPY.invalidAction }))
      .toHaveAttribute("href", "/timer");
    await expect.element(countdown()).not.toBeInTheDocument();
    expect(document.querySelector("svg")).toBeNull();
  });

  test("Scenario: Recover from an incomplete timer link", async () => {
    await render(<InvalidTimerPage />);

    await expect
      .element(page.getByRole("heading", { name: TIMER_COPY.invalidHeading }))
      .toBeVisible();
    await expect
      .element(page.getByRole("link", { name: TIMER_COPY.invalidAction }))
      .toHaveAttribute("href", "/timer");
    await expect.element(countdown()).not.toBeInTheDocument();
  });

  test.each(PHONE_LAYOUTS)(
    "Scenario: Use the timer on a phone and with a keyboard ($colorScheme, $width px)",
    async ({ colorScheme, width }) => {
      await commands.reduceMotion();
      await commands.emulateColorScheme(colorScheme);
      await page.viewport(width, PHONE_HEIGHT);
      await render(
        <>
          <TimerSetup clock={startTime} />
          <TimerDisplay schedule={FIFTY_TEN} />
        </>,
      );
      await expect.element(countdown()).toBeVisible();
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);

      await tabForward();
      await expect.element(workSelect()).toHaveFocus();
      await tabForward();
      await expect.element(breakSelect()).toHaveFocus();
      await tabForward();
      await expect
        .element(page.getByRole("button", { name: TIMER_COPY.start }))
        .toHaveFocus();
      await userEvent.keyboard("{Enter}");
      expect(timerRouter.push).toHaveBeenCalledWith(`/timer/50/10/${T}`);
      expect(document.getAnimations()).toEqual([]);
    },
  );
});
