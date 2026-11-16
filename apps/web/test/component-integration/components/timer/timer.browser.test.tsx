// The Timer's setup and a running timer, in Chromium and WebKit, with a
// clock the test sets. The presence action is mocked; the server test
// (timer-presence.server.test.ts) checks what it counts.
import { beforeEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { reportTimerPresenceAction } from "@/timer/presence-action.ts";
import type { TimerSchedule } from "@/timer/schedule.ts";
import { TIMER_COPY } from "@/ui/copy/timer.ts";
import { timerRouter } from "../../../support/timer/timer-router.ts";
import {
  countdown,
  minutesAfter,
  phaseHeading,
  renderSetup,
  renderTimer,
  returnToTabAt,
  ringDrawn,
  T,
} from "../../../support/timer/timer-test-kit.tsx";

vi.mock(
  "next/navigation",
  () => import("../../../support/timer/timer-router.ts"),
);

// Minutes into a phase, for a timer seen partway through it.
const PARTWAY = 5;
const WORK = 50;
const BREAK = 10;
const CYCLE: number = WORK + BREAK;

const FIFTY_TEN: TimerSchedule = {
  workMinutes: WORK,
  breakMinutes: BREAK,
  startMs: T,
};

function workSelect(): ReturnType<typeof page.getByRole> {
  return page.getByRole("combobox", { name: TIMER_COPY.workLabel });
}

function breakSelect(): ReturnType<typeof page.getByRole> {
  return page.getByRole("combobox", { name: TIMER_COPY.breakLabel });
}

beforeEach(() => {
  sessionStorage.clear();
  timerRouter.push.mockReset();
  vi.mocked(reportTimerPresenceAction).mockResolvedValue({
    kind: "count",
    others: 0,
  });
});

describe("use_case_timer_start", () => {
  test("Start opens a new schedule of the chosen durations, starting now with work", async () => {
    await renderSetup();
    await expect.element(workSelect()).toHaveValue("50");
    await expect.element(breakSelect()).toHaveValue("10");

    await workSelect().selectOptions("25");
    await breakSelect().selectOptions("15");
    await page.getByRole("button", { name: TIMER_COPY.start }).click();

    expect(timerRouter.push).toHaveBeenCalledWith(`/timer/25/15/${T}`);
  });

  test("a new timer shows work with its whole length left and an empty ring", async () => {
    await renderTimer({ workMinutes: 25, breakMinutes: 15, startMs: T });

    await expect.element(phaseHeading("Work")).toBeVisible();
    await expect.element(countdown()).toHaveTextContent("25:00");
    expect(ringDrawn()).toBe(0);
    await expect
      .element(page.getByRole("status").filter({ hasText: "Work time." }))
      .toBeInTheDocument();
  });
});

describe("use_case_timer_join_link", () => {
  test("a link opened partway through shows its current phase and time left", async () => {
    await renderTimer(FIFTY_TEN, minutesAfter(FIFTY_TEN, WORK + PARTWAY));

    await expect.element(phaseHeading("Break")).toBeVisible();
    await expect.element(countdown()).toHaveTextContent("05:00");
    expect(ringDrawn()).toBeCloseTo(PARTWAY / BREAK);
  });

  test("a link to a schedule that hasn't started shows why, and the way to setup", async () => {
    await renderTimer(FIFTY_TEN, minutesAfter(FIFTY_TEN, -PARTWAY));

    await expect
      .element(page.getByRole("heading", { name: TIMER_COPY.invalidHeading }))
      .toBeVisible();
    await expect.element(countdown()).not.toBeInTheDocument();
    await expect
      .element(page.getByRole("link", { name: TIMER_COPY.invalidAction }))
      .toHaveAttribute("href", "/timer");
  });
});

describe("use_case_timer_join_global", () => {
  test("Join global timer opens the epoch schedule of the chosen durations", async () => {
    await renderSetup();
    await workSelect().selectOptions("30");
    await page.getByRole("button", { name: TIMER_COPY.joinGlobal }).click();

    expect(timerRouter.push).toHaveBeenCalledWith("/timer/30/10/0");
    await expect
      .element(page.getByRole("button", { name: TIMER_COPY.joinGlobal }))
      .toHaveAccessibleDescription(TIMER_COPY.joinGlobalHint);
  });
});

describe("use_case_timer_follow_cycle", () => {
  test("the timer moves to break and back to work at the boundaries, and catches up after missed periods", async () => {
    await renderTimer(FIFTY_TEN);
    await expect.element(countdown()).toHaveTextContent("50:00");

    returnToTabAt(minutesAfter(FIFTY_TEN, WORK));
    await expect.element(phaseHeading("Break")).toBeVisible();
    await expect.element(countdown()).toHaveTextContent("10:00");
    expect(ringDrawn()).toBe(0);

    returnToTabAt(minutesAfter(FIFTY_TEN, CYCLE));
    await expect.element(phaseHeading("Work")).toBeVisible();
    await expect.element(countdown()).toHaveTextContent("50:00");

    returnToTabAt(minutesAfter(FIFTY_TEN, 2 * CYCLE + PARTWAY));
    await expect.element(phaseHeading("Work")).toBeVisible();
    await expect.element(countdown()).toHaveTextContent("45:00");
  });
});

describe("use_case_timer_see_others", () => {
  test("the timer shows how many others follow its schedule", async () => {
    vi.mocked(reportTimerPresenceAction).mockResolvedValue({
      kind: "count",
      others: 2,
    });
    await renderTimer(FIFTY_TEN);

    await expect.element(page.getByText("2 others here")).toBeVisible();
    await expect
      .element(page.getByRole("button", { name: TIMER_COPY.copyLink }))
      .toBeVisible();
    expect(reportTimerPresenceAction).toHaveBeenCalledWith(FIFTY_TEN);
  });

  test("a signed-out visitor runs the timer and copies its link, but neither reports nor sees the count", async () => {
    vi.mocked(reportTimerPresenceAction).mockClear().mockResolvedValue({
      kind: "count",
      others: 2,
    });
    await renderTimer(FIFTY_TEN, minutesAfter(FIFTY_TEN, PARTWAY), {
      signedIn: false,
    });

    await expect.element(countdown()).toHaveTextContent("45:00");
    await expect
      .element(page.getByRole("button", { name: TIMER_COPY.copyLink }))
      .toBeVisible();
    await expect
      .element(page.getByText(TIMER_COPY.others(2)))
      .not.toBeInTheDocument();
    expect(reportTimerPresenceAction).not.toHaveBeenCalled();
  });

  test("a failed report shows the count as unavailable, the countdown keeps going, and a later report recovers", async () => {
    vi.mocked(reportTimerPresenceAction).mockRejectedValueOnce(
      new Error("offline"),
    );
    await renderTimer(FIFTY_TEN);

    await expect
      .element(page.getByText(TIMER_COPY.othersUnavailable))
      .toBeVisible();
    await expect
      .element(page.getByText(TIMER_COPY.others(0)))
      .not.toBeInTheDocument();

    vi.mocked(reportTimerPresenceAction).mockResolvedValueOnce({
      kind: "count",
      others: 1,
    });
    returnToTabAt(minutesAfter(FIFTY_TEN, 1));
    await expect.element(page.getByText(TIMER_COPY.others(1))).toBeVisible();
    await expect.element(countdown()).toHaveTextContent("49:00");
  });
});

// The trail's Timer link back to setup is checked in
// header-breadcrumbs.test.ts.
describe("use_case_timer_return_to_setup", () => {
  test("setup offers the durations of the timer this tab last showed", async () => {
    const shown = await renderTimer({
      workMinutes: 25,
      breakMinutes: 15,
      startMs: T,
    });
    await expect.element(countdown()).toBeVisible();
    await shown.unmount();

    await renderSetup();
    await expect.element(workSelect()).toHaveValue("25");
    await expect.element(breakSelect()).toHaveValue("15");
  });
});
