// Visual tests: each page of the site in every theme, under Light and Dark,
// at a laptop's and a phone's width, compared with the baselines committed
// beside the specs (the `visual` project in playwright.config.ts). A spec
// describes one page: how to reach it with fixed data, and which of its
// parts change between runs. This module takes the screenshots: it applies
// the theme, waits for the fonts, and hides animations, the caret and the
// changing parts.
import { expect, type Locator, type Page } from "@playwright/test";
import { MODE_ATTRIBUTE, THEME_ATTRIBUTE } from "@/themes/theme-choice.ts";
import { THEME_IDS, type ThemeId, type ThemeMode } from "@/themes/themes.ts";
import { type TestData, test } from "../fixtures.ts";
import { WHOLE_DATABASE_TAG } from "../whole-database.ts";

// One page as the visual tests see it.
interface VisualPage {
  // The page's part of each screenshot's name, such as "login-danger".
  readonly name: string;
  // Whether the page shows every project in the database, such as the
  // projects list. Its tests then start with no projects, so it shows only
  // the ones that open makes.
  readonly listsEveryProject: boolean;
  // Makes the page's data with fixed names and texts, opens the page, and
  // waits until it shows all of its content.
  readonly open: (page: Page, testData: TestData) => Promise<void>;
  // The parts of the page that differ between runs, such as dates, if any.
  // Each shot covers them with a box, so their boxes must not change size
  // with their text.
  readonly changing?: (page: Page) => readonly Locator[];
}

const SHOT_MODES: readonly ThemeMode[] = ["light", "dark"];

// A laptop's screen and a phone's, in CSS pixels. Each shot is of the whole
// page; the height matters only to a page shorter than the screen.
const SHOT_VIEWPORTS = [
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
] as const;

// Saves the theme and mode as the site's theme picker does, in the cookie
// that src/themes/theme-choice.ts reads before the page's first paint.
async function saveThemeCookie(
  page: Page,
  baseUrl: string,
  theme: ThemeId,
  mode: ThemeMode,
): Promise<void> {
  await page
    .context()
    .addCookies([{ name: "theme", value: `${theme}.${mode}`, url: baseUrl }]);
}

// Checks that the page shows the chosen theme and mode, so a shot never
// records the default by mistake.
async function expectTheme(
  page: Page,
  theme: ThemeId,
  mode: ThemeMode,
): Promise<void> {
  const html = page.locator("html");
  await expect(html).toHaveAttribute(THEME_ATTRIBUTE, theme);
  await expect(html).toHaveAttribute(MODE_ATTRIBUTE, mode);
}

// Makes the screen as tall as the page, so that the whole page is on screen:
// a sticky part, such as the chat's composer, then sits where it does at the
// end of a scroll, not over the page's middle, and parts drawn only once
// they are on screen are drawn.
async function fitScreenToPage(
  page: Page,
  screen: { readonly width: number; readonly height: number },
): Promise<void> {
  const pageHeight = await page.evaluate(
    (): number => document.documentElement.scrollHeight,
  );
  await page.setViewportSize({
    width: screen.width,
    height: Math.max(screen.height, pageHeight),
  });
}

function waitForFonts(page: Page): Promise<void> {
  return page.evaluate(async (): Promise<void> => {
    await document.fonts.ready;
  });
}

// Declares the page's tests: one per theme, mode and width, each comparing
// the whole page with its baseline. A test and its baseline share a name:
// `<page>-<theme>-<mode>-<width>`.
function describeVisualPage(visualPage: VisualPage): void {
  let tag: string[] = [];
  if (visualPage.listsEveryProject) {
    tag = [WHOLE_DATABASE_TAG];
  }
  for (const theme of THEME_IDS) {
    for (const mode of SHOT_MODES) {
      for (const viewport of SHOT_VIEWPORTS) {
        test(
          `${visualPage.name}-${theme}-${mode}-${viewport.width}`,
          {
            tag,
          },
          async ({ page, testData, baseURL }, testInfo) => {
            if (baseURL === undefined) {
              throw new Error("The visual tests need the config's baseURL");
            }
            if (visualPage.listsEveryProject) {
              await testData.deleteAllProjects();
            }
            await page.setViewportSize(viewport);
            await saveThemeCookie(page, baseURL, theme, mode);
            await visualPage.open(page, testData);
            await expectTheme(page, theme, mode);
            await waitForFonts(page);
            await fitScreenToPage(page, viewport);
            await expect(page).toHaveScreenshot(`${testInfo.title}.png`, {
              fullPage: true,
              animations: "disabled",
              caret: "hide",
              mask: [...(visualPage.changing?.(page) ?? [])],
            });
          },
        );
      }
    }
  }
}

export type { VisualPage };
export { describeVisualPage };
