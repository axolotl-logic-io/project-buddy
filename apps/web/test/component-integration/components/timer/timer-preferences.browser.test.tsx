import { wcagContrast } from "culori";
import { beforeEach, expect, test, vi } from "vitest";
import { commands, page, userEvent } from "vitest/browser";
import { saveThemeChoiceAction } from "@/themes/save-theme-choice-action.ts";
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
  renderTimer,
  returnToTabAt,
  T,
} from "../../../support/timer/timer-test-kit.tsx";
import { applyTheme } from "../../themes/theme-test-kit.ts";

vi.mock("@/themes/save-theme-choice-action.ts", () => ({
  saveThemeChoiceAction: vi.fn(),
}));

vi.mock(
  "next/navigation",
  () => import("../../../support/timer/timer-router.ts"),
);

beforeEach(() => {
  applyTheme("parchment");
  vi.mocked(saveThemeChoiceAction).mockResolvedValue();
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
  expect(saveThemeChoiceAction).toHaveBeenLastCalledWith({
    theme: "parchment",
    mode: "soot-brass",
  });
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
    const stage = page
      .getByRole("region", { name: TIMER_COPY.displayLabel })
      .element();
    expect(getComputedStyle(stage).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    const paper = getComputedStyle(document.documentElement).getPropertyValue(
      "--background",
    );
    for (const element of [
      countdown().element(),
      phaseHeading("Work").element(),
      page.getByText(TIMER_COPY.next("break"), { exact: true }).element(),
    ]) {
      expect(
        wcagContrast(getComputedStyle(element).color, paper),
      ).toBeGreaterThanOrEqual(AA_TEXT_CONTRAST);
    }
    const progress = stage.querySelector("pattern rect");
    if (progress === null) {
      throw new Error("The timer has no visible progress paint");
    }
    expect(
      wcagContrast(getComputedStyle(progress).fill, paper),
    ).toBeGreaterThanOrEqual(AA_GRAPHIC_CONTRAST);
    await userEvent.keyboard("{Escape}");
    await expect.element(countdown()).toHaveTextContent("02:00:00");
    const bounds = countdown().element().getBoundingClientRect();
    const dial = stage.querySelector("svg");
    if (dial === null) {
      throw new Error("The timer has no dial");
    }
    const circle = dial.getBoundingClientRect();
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    expect(centerX).toBeCloseTo(circle.left + circle.width / 2, 0);
    expect(centerY).toBeCloseTo(circle.top + circle.height / 2, 0);
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

function litMarkers(): number {
  const markers = [
    ...page
      .getByRole("region", { name: TIMER_COPY.displayLabel })
      .element()
      .querySelectorAll("g[data-passed]"),
  ];
  const first = markers.at(0);
  if (first === undefined) {
    throw new Error("The dial has no markers");
  }
  const litColor = getComputedStyle(first).color;
  return markers.filter((marker) => getComputedStyle(marker).color === litColor)
    .length;
}

test.each(THEME_MODES)(
  "%s lights symbols as the arc passes them and resets with the next period",
  async (mode) => {
    await commands.reduceMotion();
    applyTheme("parchment", mode);
    await renderTimer(SCHEDULE);
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
