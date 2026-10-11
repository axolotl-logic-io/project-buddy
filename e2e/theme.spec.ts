import { expect, type Page } from "@playwright/test";
import { SESSION_COOKIE_NAME } from "@/auth/session-token.ts";
import { DEFAULT_THEME_CHOICE, THEMES } from "@/themes/themes.ts";
import { COPY } from "@/ui/copy.ts";
import { test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";

// The theme and mode on <html>, as the page applies them.
interface AppliedChoice {
  readonly theme: string | null;
  readonly mode: string | null;
}

const FIRST_PAINT_RECORD = "themeAtFirstPaint";

// The <html> tag of the HTML the server sent, and whether the pre-paint
// script runs inside <head>, before the body.
const HTML_TAG = /<html[^>]*>/u;
const SCRIPT_IN_HEAD =
  /<head>(?:(?!<\/head>).)*<script>[^<]*document\.cookie[^<]*<\/script>(?:(?!<\/head>).)*<\/head>\s*<body/su;

function appliedChoice(page: Page): Promise<AppliedChoice> {
  return page.evaluate(() => ({
    theme: document.documentElement.getAttribute("data-theme"),
    mode: document.documentElement.getAttribute("data-mode"),
  }));
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
function recordFirstPaint(record: string): void {
  const choices: AppliedChoice[] = [];
  function capture(): void {
    choices.push({
      theme: document.documentElement.getAttribute("data-theme"),
      mode: document.documentElement.getAttribute("data-mode"),
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

const GRAVY_FALLS: (typeof THEMES)[number] = THEMES[0];

test("use_case_choose_theme", async ({ page, context }) => {
  await page.addInitScript(recordFirstPaint, FIRST_PAINT_RECORD);
  await logIn(page);

  await test.step("before any choice, the default theme under System", async () => {
    expect(await appliedChoice(page)).toEqual(DEFAULT_THEME_CHOICE);
  });

  await test.step("choosing a theme and Dark applies them at once", async () => {
    await openPicker(page);
    await choose(page, COPY.theme.themeLabel, GRAVY_FALLS.name);
    await choose(page, COPY.theme.modeLabel, COPY.theme.modes.dark);
    await page.keyboard.press("Escape");

    expect(await appliedChoice(page)).toEqual({
      theme: GRAVY_FALLS.id,
      mode: "dark",
    });
    await expectColors(page, "dark");
  });

  await test.step("a reload shows the choice from the first paint", async () => {
    const response = await page.reload();
    const html = (await response?.text()) ?? "";

    // The server sends the same, prerendered HTML to everyone ...
    expect(HTML_TAG.exec(html)?.[0]).toContain(
      `data-theme="${DEFAULT_THEME_CHOICE.theme}" data-mode="${DEFAULT_THEME_CHOICE.mode}"`,
    );
    expect(html).toMatch(SCRIPT_IN_HEAD);
    // ... and the script in its head applies the choice before the body.
    const dark = { theme: GRAVY_FALLS.id, mode: "dark" };
    await expect.poll(() => firstPaintChoices(page)).toEqual([dark, dark]);
    await expectColors(page, "dark");
  });

  await test.step("signed out, the passphrase page keeps it", async () => {
    await context.clearCookies({ name: SESSION_COOKIE_NAME });
    await page.goto("/projects");

    await expect(page).toHaveURL("/login");
    const dark = { theme: GRAVY_FALLS.id, mode: "dark" };
    await expect.poll(() => firstPaintChoices(page)).toEqual([dark, dark]);
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
