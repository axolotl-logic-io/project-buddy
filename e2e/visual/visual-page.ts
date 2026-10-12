// Visual tests: each page of the site in every theme, under Light and Dark,
// at a laptop's and a phone's width, and in the default theme on each of
// SHOT_DEVICES, compared with the baselines committed beside the specs (the
// `visual` projects in playwright.config.ts). A spec describes one page: how
// to reach it with fixed data, and which of its parts change between runs.
// This module takes the screenshots: it signs in and applies the theme,
// waits until the page has settled and its fonts have loaded, and hides
// animations, the caret and the changing parts.
import {
  type BrowserContext,
  expect,
  type Locator,
  type Page,
} from "@playwright/test";
import type { SessionUser } from "@/auth/session-token.ts";
import {
  MODE_ATTRIBUTE,
  THEME_ATTRIBUTE,
  themeChoiceCookie,
} from "@/themes/theme-choice.ts";
import {
  DEFAULT_THEME_CHOICE,
  THEME_IDS,
  type ThemeChoice,
  type ThemeMode,
} from "@/themes/themes.ts";
import { type TestData, test } from "../fixtures.ts";
import { testSessionCookie } from "../log-in.ts";
import { fitScreenToPage } from "./fit-screen.ts";
import { SHOT_DEVICES, shotDeviceTag } from "./shot-devices.ts";

// One page as the visual tests see it.
interface VisualPage {
  // The page's part of each screenshot's name, such as "new-project-unavailable".
  readonly name: string;
  // Whether the page is for a signed-in user. Its tests then start signed
  // in as the test's own account, which has no projects but the ones open
  // makes, so open goes straight to the page; the others start signed out.
  readonly signedIn: boolean;
  // Makes the page's data with fixed names and texts, opens the page, and
  // waits until it shows all of its content.
  readonly open: (page: Page, testData: TestData) => Promise<void>;
  // The parts of the page that differ between runs, such as dates, if any.
  // Each shot covers them with a box, so their boxes must not change size
  // with their text. Each locator must match at least one element.
  readonly changing?: (page: Page) => readonly Locator[];
}

// One screenshot of a page: its theme and mode, and the screen it's taken on.
interface Shot {
  readonly choice: ThemeChoice;
  // The screen's part of the shot's name: its width, or the device's name.
  readonly screen: string;
  // A laptop's or a phone's screen in Desktop Chrome, or, if undefined, the
  // project's device.
  readonly viewport?: { readonly width: number; readonly height: number };
  readonly tags: readonly string[];
}

const SHOT_MODES: readonly ThemeMode[] = ["light", "dark"];

// A laptop's screen and a phone's, in CSS pixels. Each shot is of the whole
// page; the height matters only to a page shorter than the screen.
const SHOT_VIEWPORTS = [
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
] as const;

// What a page marks as still loading, such as a skeleton (WAI-ARIA's
// aria-busy).
const BUSY = '[aria-busy="true"]';

// Stands for a value in the copy, such as a date, in copyPattern. A
// private-use character, which no copy text holds.
const ANY_VALUE = "\u{E000}";
const REGEXP_SYNTAX = /[\\^$.*+?()[\]{}|]/gu;

// A pattern for the whole of a text from the copy modules with any values in
// it, such as copyPattern(PROJECTS_COPY.created(ANY_VALUE)) for "started"
// and any date: a mask that finds its part by its text follows the copy.
function copyPattern(text: string): RegExp {
  const literals = text
    .split(ANY_VALUE)
    .map((literal) => literal.replaceAll(REGEXP_SYNTAX, "\\$&"));
  return new RegExp(`^${literals.join(".+")}$`, "u");
}

type Cookie = Parameters<BrowserContext["addCookies"]>[0][number];

// Saves the theme and mode as the site's theme picker does, in the cookie
// that src/themes/theme-choice.ts reads before the page's first paint, and
// signs in as account unless it is undefined.
async function prepareBrowser(
  page: Page,
  baseUrl: string,
  choice: ThemeChoice,
  account: SessionUser | undefined,
): Promise<void> {
  const cookies: Cookie[] = [{ ...themeChoiceCookie(choice), url: baseUrl }];
  if (account !== undefined) {
    cookies.push(await testSessionCookie(account, baseUrl));
  }
  await page.context().addCookies(cookies);
}

// Checks that the page shows the chosen theme and mode, so a shot never
// records the default by mistake.
async function expectTheme(page: Page, choice: ThemeChoice): Promise<void> {
  const html = page.locator("html");
  await expect(html).toHaveAttribute(THEME_ATTRIBUTE, choice.theme);
  await expect(html).toHaveAttribute(MODE_ATTRIBUTE, choice.mode);
}

// Waits until nothing on the page is still loading and its fonts are in, so
// a shot never records a skeleton or a fallback font.
async function waitUntilSettled(page: Page): Promise<void> {
  await expect(page.locator(BUSY)).toHaveCount(0);
  await page.evaluate(async (): Promise<void> => {
    await document.fonts.ready;
  });
}

// Checks that each changing part is on the page, so that a change to its
// text or role fails here instead of leaving a date unmasked in the shot.
async function expectEachFound(masks: readonly Locator[]): Promise<void> {
  await Promise.all(
    masks.map(async (mask): Promise<void> => {
      await expect(mask, `a changing part, ${mask}`).not.toHaveCount(0);
    }),
  );
}

// The shots of every page: each theme and mode at each of SHOT_VIEWPORTS,
// and the default theme in each mode on each of SHOT_DEVICES.
function everyShot(): readonly Shot[] {
  const shots: Shot[] = [];
  for (const theme of THEME_IDS) {
    for (const mode of SHOT_MODES) {
      for (const viewport of SHOT_VIEWPORTS) {
        shots.push({
          choice: { theme, mode },
          screen: String(viewport.width),
          viewport,
          tags: [],
        });
      }
    }
  }
  const { theme } = DEFAULT_THEME_CHOICE;
  for (const device of SHOT_DEVICES) {
    for (const mode of SHOT_MODES) {
      shots.push({
        choice: { theme, mode },
        screen: device.name,
        tags: [shotDeviceTag(device)],
      });
    }
  }
  return shots;
}

// Declares the page's tests, one per shot, each comparing the whole page
// with its baseline. A test and its baseline share a name:
// `<page>-<theme>-<mode>-<screen>`.
function describeVisualPage(visualPage: VisualPage): void {
  for (const shot of everyShot()) {
    const { theme, mode } = shot.choice;
    test(
      `${visualPage.name}-${theme}-${mode}-${shot.screen}`,
      {
        tag: [...shot.tags],
      },
      async ({ account, page, testData, baseURL }, testInfo): Promise<void> => {
        if (baseURL === undefined) {
          throw new Error("The visual tests need the config's baseURL");
        }
        if (shot.viewport !== undefined) {
          await page.setViewportSize(shot.viewport);
        }
        let signedInAs: SessionUser | undefined;
        if (visualPage.signedIn) {
          signedInAs = account;
        }
        await prepareBrowser(page, baseURL, shot.choice, signedInAs);
        await visualPage.open(page, testData);
        await expectTheme(page, shot.choice);
        await waitUntilSettled(page);
        const masks = visualPage.changing?.(page) ?? [];
        await expectEachFound(masks);
        await fitScreenToPage(page);
        await expect(page).toHaveScreenshot(`${testInfo.title}.png`, {
          fullPage: true,
          animations: "disabled",
          caret: "hide",
          mask: [...masks],
        });
      },
    );
  }
}

export type { VisualPage };
export { ANY_VALUE, copyPattern, describeVisualPage };
