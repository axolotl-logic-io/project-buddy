// The theme picker and the theme's fonts, the way the user meets them: open
// the picker, choose a theme or a mode, and wait for the theme's typefaces.
import { expect, type Page } from "@playwright/test";
import { themeChoiceCookie } from "@/themes/theme-choice.ts";
import type { ThemeChoice } from "@/themes/themes.ts";
import { THEME_COPY } from "@/ui/copy/theme.ts";

async function choose(page: Page, group: string, name: string): Promise<void> {
  await page
    .getByRole("group", { name: group })
    .getByRole("menuitemradio", { name })
    .click();
  await expect(
    page.getByRole("menuitemradio", { name, exact: true }),
  ).toHaveAttribute("aria-checked", "true");
}

async function openPicker(page: Page): Promise<void> {
  await page.getByRole("button", { name: THEME_COPY.picker }).click();
}

// Waits until this browser has saved choice, so the next page loads with
// it: saving is a round trip to the server, which a reload could race.
async function expectThemeSaved(
  page: Page,
  choice: ThemeChoice,
): Promise<void> {
  const { name, value } = themeChoiceCookie(choice);
  await expect
    .poll(
      async () =>
        (await page.context().cookies()).find((cookie) => cookie.name === name)
          ?.value,
    )
    .toBe(value);
}

const FONT_TOKENS = ["body-font", "heading-font", "mono-font"] as const;

// For each font token, whether the browser has loaded the first family it
// names: a self-hosted typeface, not a fallback.
function fontsLoaded(page: Page): Promise<Record<string, boolean>> {
  return page.evaluate(async (tokens) => {
    const style = getComputedStyle(document.documentElement);
    const entries = await Promise.all(
      tokens.map(async (token) => {
        const [family = ""] = style.getPropertyValue(`--${token}`).split(",");
        const faces = await document.fonts.load(`1rem ${family.trim()}`);
        return [token, faces.length > 0] as const;
      }),
    );
    return Object.fromEntries(entries);
  }, FONT_TOKENS);
}

const ALL_FONTS_LOADED = Object.fromEntries(
  FONT_TOKENS.map((token) => [token, true]),
);

// Waits until the page has loaded each of the theme's fonts, so what a test
// measures is the theme's text, not a fallback's.
async function loadFonts(page: Page): Promise<void> {
  expect(await fontsLoaded(page)).toEqual(ALL_FONTS_LOADED);
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

export { choose, expectThemeSaved, loadFonts, openPicker };
