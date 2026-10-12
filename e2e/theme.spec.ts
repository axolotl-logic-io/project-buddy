import { expect, type Locator, type Page } from "@playwright/test";
import { SESSION_COOKIE_NAME } from "@/auth/session-token.ts";
import { MODE_ATTRIBUTE, THEME_ATTRIBUTE } from "@/themes/theme-choice.ts";
import { DEFAULT_THEME_CHOICE, THEMES } from "@/themes/themes.ts";
import { COPY } from "@/ui/copy.ts";
import { test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";

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
  await page.getByRole("button", { name: COPY.theme.picker }).click();
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
const OTHER_THEME_DARK: AppliedChoice = { theme: OTHER_THEME.id, mode: "dark" };

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

// A phone's screen, in CSS pixels. The tests' own is a laptop's, 1280 wide.
const PHONE_VIEWPORT = { width: 390, height: 844 } as const;

// How many lines of text an element takes: its height over its line height,
// to the nearest line.
function lineCount(element: Locator): Promise<number> {
  return element.evaluate((node) =>
    Math.round(
      node.getBoundingClientRect().height /
        Number.parseFloat(getComputedStyle(node).lineHeight),
    ),
  );
}

test("use_case_choose_theme", async ({ page, context }) => {
  await page.addInitScript(recordFirstPaint, FIRST_PAINT_ARGUMENT);
  await logIn(page);

  await test.step("before any choice, the default theme under System", async () => {
    expect(await appliedChoice(page)).toEqual(DEFAULT_THEME_CHOICE);
  });

  await test.step("choosing a theme and Dark applies them at once", async () => {
    await openPicker(page);
    await choose(page, COPY.theme.themeLabel, OTHER_THEME.name);
    await choose(page, COPY.theme.modeLabel, COPY.theme.modes.dark);
    await page.keyboard.press("Escape");

    expect(await appliedChoice(page)).toEqual(OTHER_THEME_DARK);
    await expectColors(page, "dark");
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

  await test.step("signed out, the passphrase page keeps it", async () => {
    await context.clearCookies({ name: SESSION_COOKIE_NAME });
    await page.goto("/projects");

    await expect(page).toHaveURL("/login");
    await expectFirstPaint(page, OTHER_THEME_DARK);
    await expectColors(page, "dark");
  });

  await test.step("System follows the computer's setting", async () => {
    await openPicker(page);
    await choose(page, COPY.theme.modeLabel, COPY.theme.modes.system);
    await page.keyboard.press("Escape");

    await page.emulateMedia({ colorScheme: "dark" });
    await expectColors(page, "dark");
    await page.emulateMedia({ colorScheme: "light" });
    await expectColors(page, "light");
    expect((await appliedChoice(page)).mode).toBe("system");
  });
});

// Each theme, chosen on the passphrase page: it applies at once with its
// own fonts, and a reload shows it from the first paint. One test per theme,
// under the use case's slug.
test.describe("use_case_choose_theme", () => {
  for (const { id, name } of THEMES) {
    test(`the ${name} theme`, async ({ page }) => {
      await page.addInitScript(recordFirstPaint, FIRST_PAINT_ARGUMENT);
      await page.goto("/login");
      await openPicker(page);
      await choose(page, COPY.theme.themeLabel, name);
      await page.keyboard.press("Escape");

      const chosen: AppliedChoice = {
        theme: id,
        mode: DEFAULT_THEME_CHOICE.mode,
      };
      expect(await appliedChoice(page)).toEqual(chosen);
      expect(await fontsLoaded(page)).toEqual(ALL_FONTS_LOADED);

      await test.step("the site's name fits on one line, wide and on a phone", async () => {
        const title = page.getByRole("heading", { name: COPY.site.name });
        expect(await lineCount(title), "wide").toBe(1);
        await page.setViewportSize(PHONE_VIEWPORT);
        expect(await lineCount(title), "on a phone").toBe(1);
      });

      await page.reload();
      await expectFirstPaint(page, chosen);
    });
  }
});
