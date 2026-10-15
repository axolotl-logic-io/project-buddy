// Switching the site's extras (src/flags/flags.ts) on the Settings page the
// way the user does, and waiting until her choice is saved.
import { expect, type Locator, type Page } from "@playwright/test";
import { hiddenFlagsCookie } from "@/flags/flag-choice.ts";
import type { FlagId } from "@/flags/flags.ts";

function flagSwitch(page: Page, label: string): Locator {
  return page.getByRole("switch", { name: label });
}

// Waits until this browser has saved hidden as the user's choice, so the
// next page loads with it.
async function expectSaved(
  page: Page,
  hidden: readonly FlagId[],
): Promise<void> {
  const { name, value } = hiddenFlagsCookie(hidden);
  await expect
    .poll(
      async () =>
        (await page.context().cookies()).find((cookie) => cookie.name === name)
          ?.value,
    )
    .toBe(value);
}

// Switches the extra labelled label on or off on the Settings page, and
// waits until the choice, which then hides exactly hidden, is saved.
async function switchExtra(
  page: Page,
  label: string,
  on: boolean,
  hidden: readonly FlagId[],
): Promise<void> {
  await page.goto("/settings");
  const control = flagSwitch(page, label);
  await expect(control).toBeChecked({ checked: !on });
  await control.click();
  await expect(control).toBeChecked({ checked: on });
  await expectSaved(page, hidden);
}

export { switchExtra };
