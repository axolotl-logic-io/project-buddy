// Switching the site's extras (src/flags/flags.ts) on the Settings page the
// way the user does, and reading what a page shows of them.
import { expect, type Locator, type Page } from "@playwright/test";
import { hiddenFlagsCookie } from "@/flags/flag-choice.ts";
import { extraTag, type FlagId } from "@/flags/flags.ts";

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

// The page's decoration: the background image behind its body.
function pageDecoration(page: Page): Promise<string> {
  return page.evaluate(
    (): string => getComputedStyle(document.body).backgroundImage,
  );
}

// How many of the elements tagged as the extra id show on screen: laid out,
// and at least partly inside the window. Found by extraTag's attribute
// rather than by role, so a test built from FLAGS covers every extra.
function extrasOnScreen(page: Page, id: FlagId): Promise<number> {
  const selector = Object.entries(extraTag(id))
    .map(([name, value]) => `[${name}="${value}"]`)
    .join("");
  return page.locator(selector).evaluateAll(
    (elements): number =>
      elements.filter((element) => {
        const { top, bottom, left, right } = element.getBoundingClientRect();
        return (
          element.checkVisibility() &&
          bottom > 0 &&
          top < window.innerHeight &&
          right > 0 &&
          left < window.innerWidth
        );
      }).length,
  );
}

export { extrasOnScreen, pageDecoration, switchExtra };
