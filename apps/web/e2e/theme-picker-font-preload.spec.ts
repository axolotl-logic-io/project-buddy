// Another theme's fonts start loading when she points at it, or moves the
// keyboard to it, in the open theme picker, so choosing it shows its
// typefaces without a flash of the fallback font. Each file is preloaded
// once, and nothing is preloaded for the applied theme or on opening.
import { expect, type Locator, type Page } from "@playwright/test";
import {
  THEME_TYPEFACES,
  TYPEFACE_FONT_URLS,
} from "@/themes/theme-font-urls.ts";
import { THEMES, type ThemeId } from "@/themes/themes.ts";
import { THEME_COPY } from "@/ui/copy/theme.ts";
import { test } from "./fixtures.ts";
import { openPicker } from "./theme-page.ts";

// The hrefs of the font preload links in <head>, in document order.
function fontPreloadLinks(page: Page): Promise<(string | null)[]> {
  return page.evaluate(() =>
    [...document.head.querySelectorAll("link")]
      .filter((link) => link.rel === "preload" && link.as === "font")
      .map((link) => link.getAttribute("href")),
  );
}

const HTTP_OK = 200;

function themeFontUrls(theme: ThemeId): string[] {
  return THEME_TYPEFACES[theme].map(
    (typeface) => TYPEFACE_FONT_URLS[typeface] ?? "",
  );
}

function themeItem(page: Page, theme: ThemeId): Locator {
  const name = THEMES.find(({ id }) => id === theme)?.name ?? theme;
  return page
    .getByRole("group", { name: THEME_COPY.themeLabel })
    .getByRole("menuitemradio", { name });
}

// The status of each response for a font file, by pathname.
function recordFontResponses(page: Page): Map<string, number[]> {
  const statuses = new Map<string, number[]>();
  page.on("response", (response) => {
    const { pathname } = new URL(response.url());
    if (pathname.endsWith(".woff2")) {
      statuses.set(pathname, [
        ...(statuses.get(pathname) ?? []),
        response.status(),
      ]);
    }
  });
  return statuses;
}

test.describe("use_case_choose_theme", () => {
  test("pointing at another theme in the picker preloads its fonts once", async ({
    page,
  }) => {
    const responses = recordFontResponses(page);
    await page.goto("/login");
    await openPicker(page);
    await expect(page.getByRole("menu")).toBeVisible();
    expect(await fontPreloadLinks(page)).toEqual([]);

    await themeItem(page, "ghost-hasslers").hover();

    const expected = themeFontUrls("ghost-hasslers");
    await expect.poll(() => fontPreloadLinks(page)).toEqual(expected);
    await expect
      .poll(() => expected.map((url) => responses.get(url)))
      .toEqual(expected.map(() => [HTTP_OK]));

    await page
      .getByRole("group", { name: THEME_COPY.modeLabel })
      .getByRole("menuitemradio", { name: THEME_COPY.modes.dark })
      .hover();
    await themeItem(page, "ghost-hasslers").hover();
    await expect(themeItem(page, "ghost-hasslers")).toBeFocused();

    expect(await fontPreloadLinks(page)).toEqual(expected);
  });

  test("moving the keyboard to another theme in the picker preloads its fonts once", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: THEME_COPY.picker }).focus();
    await page.keyboard.press("Enter");
    await expect(themeItem(page, "gravy-falls")).toBeFocused();
    expect(await fontPreloadLinks(page)).toEqual([]);

    await page.keyboard.press("ArrowDown");

    const expected = themeFontUrls("ghost-hasslers");
    await expect(themeItem(page, "ghost-hasslers")).toBeFocused();
    await expect.poll(() => fontPreloadLinks(page)).toEqual(expected);

    await page.keyboard.press("ArrowUp");
    await expect(themeItem(page, "gravy-falls")).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(themeItem(page, "ghost-hasslers")).toBeFocused();

    expect(await fontPreloadLinks(page)).toEqual(expected);
  });
});
