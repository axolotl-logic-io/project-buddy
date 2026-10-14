import { expect, type Page } from "@playwright/test";
import { SESSION_COOKIE_NAME } from "@/auth/session-token.ts";
import { MODE_ATTRIBUTE, THEME_ATTRIBUTE } from "@/themes/theme-choice.ts";
import {
  DEFAULT_THEME_CHOICE,
  THEMES,
  type ThemeChoice,
} from "@/themes/themes.ts";
import { THEME_COPY } from "@/ui/copy/theme.ts";
import { test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";
import { choose, expectThemeSaved, openPicker } from "./theme-page.ts";

// The theme and mode on <html>, as the page applies them.
interface AppliedChoice {
  readonly theme: string | null;
  readonly mode: string | null;
}

// The attributes on <html> that hold the choice, for code that runs in the
// page.
interface ChoiceAttributes {
  readonly theme: string;
  readonly mode: string;
}

const CHOICE_ATTRIBUTES: ChoiceAttributes = {
  theme: THEME_ATTRIBUTE,
  mode: MODE_ATTRIBUTE,
};

const FIRST_PAINT_RECORD = "themeAtFirstPaint";

// The <html> tag of the HTML the server sent, and whether the pre-paint
// script runs inside <head>, before the body.
const HTML_TAG = /<html[^>]*>/u;
const SCRIPT_IN_HEAD =
  /<head>(?:(?!<\/head>).)*<script>[^<]*document\.cookie[^<]*<\/script>(?:(?!<\/head>).)*<\/head>\s*<body/su;

function appliedChoice(page: Page): Promise<AppliedChoice> {
  return page.evaluate(
    (attributes) => ({
      theme: document.documentElement.getAttribute(attributes.theme),
      mode: document.documentElement.getAttribute(attributes.mode),
    }),
    CHOICE_ATTRIBUTES,
  );
}

// The page's value for a colour token, and the theme's light and dark
// values for it.
function tokenValues(
  page: Page,
  token: string,
): Promise<{ applied: string; light: string; dark: string }> {
  return page.evaluate((name) => {
    const style = getComputedStyle(document.documentElement);
    return {
      applied: style.getPropertyValue(`--${name}`),
      light: style.getPropertyValue(`--light-${name}`),
      dark: style.getPropertyValue(`--dark-${name}`),
    };
  }, token);
}

async function expectColors(page: Page, mode: "light" | "dark"): Promise<void> {
  const values = await tokenValues(page, "background");
  expect(values.light).not.toBe(values.dark);
  expect(values.applied).toBe(values[mode]);
}

// Records the attributes on <html> as the body starts and at the first
// animation frame, before the first paint, on every page the browser opens.
function recordFirstPaint({
  record,
  attributes,
}: {
  readonly record: string;
  readonly attributes: ChoiceAttributes;
}): void {
  const choices: AppliedChoice[] = [];
  function capture(): void {
    choices.push({
      theme: document.documentElement.getAttribute(attributes.theme),
      mode: document.documentElement.getAttribute(attributes.mode),
    });
  }
  const observer = new MutationObserver(() => {
    if (document.body !== null) {
      observer.disconnect();
      Reflect.set(globalThis, record, choices);
      capture();
      requestAnimationFrame(capture);
    }
  });
  observer.observe(document, { childList: true, subtree: true });
}

function firstPaintChoices(page: Page): Promise<unknown> {
  return page.evaluate(
    (record) => Reflect.get(globalThis, record),
    FIRST_PAINT_RECORD,
  );
}

// The page showed `choice` from its first paint: as the body started and at
// the first animation frame.
async function expectFirstPaint(
  page: Page,
  choice: AppliedChoice,
): Promise<void> {
  await expect.poll(() => firstPaintChoices(page)).toEqual([choice, choice]);
}

// The HTML the server sent carries the default choice on <html>, each
// attribute in any order, and the pre-paint script inside <head>.
function expectPrerenderedDefault(html: string): void {
  const htmlTag = HTML_TAG.exec(html)?.[0];
  expect(htmlTag).toContain(
    `${THEME_ATTRIBUTE}="${DEFAULT_THEME_CHOICE.theme}"`,
  );
  expect(htmlTag).toContain(`${MODE_ATTRIBUTE}="${DEFAULT_THEME_CHOICE.mode}"`);
  expect(html).toMatch(SCRIPT_IN_HEAD);
}

const FIRST_PAINT_ARGUMENT: Parameters<typeof recordFirstPaint>[0] = {
  record: FIRST_PAINT_RECORD,
  attributes: CHOICE_ATTRIBUTES,
};

// A theme other than the default, so that a choice that wasn't saved shows.
const OTHER_THEME = THEMES.find(({ id }) => id !== DEFAULT_THEME_CHOICE.theme);
if (OTHER_THEME === undefined) {
  throw new Error("use_case_choose_theme needs a theme besides the default");
}

// The main scenario's choice: that theme, under Dark.
const OTHER_THEME_DARK: ThemeChoice = { theme: OTHER_THEME.id, mode: "dark" };

// What a choice does to the page at once is
// src/components/theme-picker.browser.test.tsx's to check.
// Stays in Playwright: prerendered HTML, first paint after a reload, and the sign-in page once the session cookie is cleared.
test("use_case_choose_theme", async ({ account, context, page }) => {
  await page.addInitScript(recordFirstPaint, FIRST_PAINT_ARGUMENT);
  await logIn(page, account);

  await test.step("before any choice, the default theme under System", async () => {
    expect(await appliedChoice(page)).toEqual(DEFAULT_THEME_CHOICE);
  });

  await test.step("she chooses a theme and Dark", async () => {
    await openPicker(page);
    await choose(page, THEME_COPY.themeLabel, OTHER_THEME.name);
    await choose(page, THEME_COPY.modeLabel, THEME_COPY.modes.dark);
    await page.keyboard.press("Escape");
    await expectThemeSaved(page, OTHER_THEME_DARK);
  });

  await test.step("a reload shows the choice from the first paint", async () => {
    const response = await page.reload();
    const html = (await response?.text()) ?? "";

    // The server sends the same, prerendered HTML to everyone ...
    expectPrerenderedDefault(html);
    // ... and the script in its head applies the choice before the body.
    await expectFirstPaint(page, OTHER_THEME_DARK);
    await expectColors(page, "dark");
  });

  await test.step("signed out, the sign-in page keeps it", async () => {
    await context.clearCookies({ name: SESSION_COOKIE_NAME });
    await page.goto("/projects");

    await expect(page).toHaveURL("/login");
    await expectFirstPaint(page, OTHER_THEME_DARK);
    await expectColors(page, "dark");
  });
});

// Each theme, chosen on the sign-in page: a reload shows it from the first
// paint. One test per theme, under the use case's slug. Its fonts and the
// site's name on one line are theme-picker.browser.test.tsx's to check.
test.describe("use_case_choose_theme", () => {
  for (const { id, name } of THEMES) {
    // Stays in Playwright: the pre-paint script must accept every theme id at first paint.
    test(`the ${name} theme`, async ({ page }) => {
      await page.addInitScript(recordFirstPaint, FIRST_PAINT_ARGUMENT);
      await page.goto("/login");
      await openPicker(page);
      await choose(page, THEME_COPY.themeLabel, name);
      await page.keyboard.press("Escape");

      const chosen: ThemeChoice = {
        theme: id,
        mode: DEFAULT_THEME_CHOICE.mode,
      };
      await expectThemeSaved(page, chosen);
      await page.reload();
      await expect
        .poll(() => firstPaintChoices(page))
        .toEqual([chosen, chosen]);
    });
  }

  // Browsers before 2025, and pages not on HTTPS or localhost, have no
  // Cookie Store API; the choice is saved all the same (#42).
  // Stays in Playwright: the cookie is saved by the server and read before paint (#42).
  test("saves the choice without the Cookie Store API", async ({ page }) => {
    await page.addInitScript(() => {
      Reflect.deleteProperty(globalThis, "cookieStore");
      Reflect.deleteProperty(Window.prototype, "cookieStore");
    });
    await page.addInitScript(recordFirstPaint, FIRST_PAINT_ARGUMENT);
    await page.goto("/login");
    expect(await page.evaluate(() => "cookieStore" in globalThis)).toBe(false);

    await openPicker(page);
    await choose(page, THEME_COPY.themeLabel, OTHER_THEME.name);
    await choose(page, THEME_COPY.modeLabel, THEME_COPY.modes.dark);
    await page.keyboard.press("Escape");

    await expectThemeSaved(page, OTHER_THEME_DARK);
    expect(await appliedChoice(page)).toEqual(OTHER_THEME_DARK);

    await page.reload();
    await expectFirstPaint(page, OTHER_THEME_DARK);
  });
});
