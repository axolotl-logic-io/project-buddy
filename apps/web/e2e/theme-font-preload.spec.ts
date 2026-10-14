// The saved theme's fonts start loading with the page: every page's
// response carries a `Link` header preloading exactly its theme's font
// files (src/proxy.ts), at the URLs the page's @font-face rules use, so each
// file downloads once. This also checks theme-font-urls.ts against the build.
import { expect, type Page, type Response } from "@playwright/test";
import { THEME_COOKIE_NAME } from "@/themes/theme-choice.ts";
import {
  THEME_TYPEFACES,
  TYPEFACE_FONT_URLS,
} from "@/themes/theme-font-urls.ts";
import type { ThemeId } from "@/themes/themes.ts";
import { test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";
import { loadFonts } from "./theme-page.ts";

// Each `<url>; params` entry of a Link header.
const LINK_ENTRY = /<(?<url>[^>]+)>(?<params>[^,]*)/gu;
const AS_FONT = /;\s*as=font(?:;|$)/u;

// The URLs a response's Link header preloads as fonts.
async function fontPreloads(
  response: Response | null,
): Promise<readonly string[]> {
  const link = (await response?.headerValue("link")) ?? "";
  return [...link.matchAll(LINK_ENTRY)]
    .filter(({ groups: { params = "" } = {} }) => AS_FONT.test(params.trim()))
    .map(({ groups: { url = "" } = {} }) => url);
}

function expectedUrls(theme: ThemeId): ReadonlySet<string | undefined> {
  return new Set(
    THEME_TYPEFACES[theme].map((typeface) => TYPEFACE_FONT_URLS[typeface]),
  );
}

// Counts the page's requests for each font file, by pathname.
function countFontRequests(page: Page): Map<string, number> {
  const counts = new Map<string, number>();
  page.on("request", (request) => {
    const { pathname } = new URL(request.url());
    if (pathname.endsWith(".woff2")) {
      counts.set(pathname, (counts.get(pathname) ?? 0) + 1);
    }
  });
  return counts;
}

// The pathnames that the page's @font-face rules for a typeface load, for
// the family its variable names first on <html>.
function fontFaceSources(page: Page, typeface: string): Promise<string[]> {
  return page.evaluate((variable) => {
    const [first = ""] = getComputedStyle(document.documentElement)
      .getPropertyValue(`--${variable}`)
      .split(",");
    const family = first.trim().replaceAll(/^["']|["']$/gu, "");
    return [...document.styleSheets].flatMap((sheet) =>
      [...sheet.cssRules]
        .filter((rule) => rule instanceof CSSFontFaceRule)
        .filter(
          (rule) =>
            rule.style
              .getPropertyValue("font-family")
              .trim()
              .replaceAll(/^["']|["']$/gu, "") === family,
        )
        .flatMap((rule) =>
          [
            ...rule.style
              .getPropertyValue("src")
              .matchAll(/url\(\s*["']?(?<url>[^"')]+)["']?\s*\)/gu),
          ].map(
            ({ groups: { url = "" } = {} }) =>
              new URL(url, sheet.href ?? document.baseURI).pathname,
          ),
        ),
    );
  }, typeface);
}

// What a page's response preloads, once the page has loaded its fonts: the
// font URLs, how many entries name them, the preloads no @font-face rule
// for their typeface loads, and the font files requested more than once.
interface PreloadReport {
  readonly urls: ReadonlySet<string | undefined>;
  readonly entries: number;
  readonly notInFontFaces: readonly string[];
  readonly requestedTwice: readonly (readonly [string, number])[];
}

async function preloadReport(
  page: Page,
  response: Response | null,
  theme: ThemeId,
  requests: ReadonlyMap<string, number>,
): Promise<PreloadReport> {
  const preloads = await fontPreloads(response);
  await loadFonts(page);
  const typefaces = THEME_TYPEFACES[theme];
  const sources = await Promise.all(
    typefaces.map((typeface) => fontFaceSources(page, typeface)),
  );
  const notInFontFaces = typefaces.filter((typeface, index) => {
    const url = new URL(TYPEFACE_FONT_URLS[typeface] ?? "", page.url());
    return !sources[index]?.includes(url.pathname);
  });
  return {
    urls: new Set(preloads),
    entries: preloads.length,
    notInFontFaces,
    requestedTwice: [...requests].filter(([, count]) => count > 1),
  };
}

// The report for a page that preloads exactly its theme's fonts, each
// once, at the URLs its @font-face rules use.
function expectedReport(theme: ThemeId): PreloadReport {
  return {
    urls: expectedUrls(theme),
    entries: THEME_TYPEFACES[theme].length,
    notInFontFaces: [],
    requestedTwice: [],
  };
}

// A cookie value, and the theme whose fonts it should preload.
const COOKIE_CASES: readonly {
  readonly name: string;
  readonly value: string | undefined;
  readonly theme: ThemeId;
}[] = [
  { name: "no saved theme", value: undefined, theme: "gravy-falls" },
  {
    name: "Ghost Hasslers, dark",
    value: "ghost-hasslers.dark",
    theme: "ghost-hasslers",
  },
  { name: "Ay, Liens! with no mode", value: "ay-liens", theme: "ay-liens" },
  { name: "an unknown theme", value: "nonsense", theme: "gravy-falls" },
];

test.describe("use_case_choose_theme", () => {
  for (const { name, value, theme } of COOKIE_CASES) {
    test(`the sign-in page preloads the fonts for ${name}`, async ({
      baseURL,
      page,
    }) => {
      if (value !== undefined && baseURL !== undefined) {
        await page
          .context()
          .addCookies([{ name: THEME_COOKIE_NAME, value, url: baseURL }]);
      }
      const requests = countFontRequests(page);

      const response = await page.goto("/login");

      expect(await preloadReport(page, response, theme, requests)).toEqual(
        expectedReport(theme),
      );
    });
  }

  test("a signed-in page preloads the default theme's fonts", async ({
    account,
    page,
  }) => {
    await logIn(page, account);
    const requests = countFontRequests(page);

    const response = await page.goto("/");

    expect(
      await preloadReport(page, response, "gravy-falls", requests),
    ).toEqual(expectedReport("gravy-falls"));
  });
});
