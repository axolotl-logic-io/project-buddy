// use_case_use_on_phone, the signed-in header: on an iPhone 15 it takes at
// most two rows in every theme, so the page starts high on the screen, and
// on a laptop one. Its buttons stay a touch target's height (44 px), the
// site's name at least WCAG 2.5.8's minimum (24 px), and nothing scrolls
// sideways. mobile.spec.ts checks every page's reflow
// and target sizes at 320 and 390 px.
import {
  expect,
  type Locator,
  type Page,
  type ViewportSize,
} from "@playwright/test";
import { THEME_ATTRIBUTE, themeChoiceCookie } from "@/themes/theme-choice.ts";
import { THEME_IDS, type ThemeId } from "@/themes/themes.ts";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { PERSONAS_COPY } from "@/ui/copy/personas.ts";
import { SETTINGS_COPY } from "@/ui/copy/settings.ts";
import { SITE_COPY } from "@/ui/copy/site.ts";
import { THEME_COPY } from "@/ui/copy/theme.ts";
import { type TestData, test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";
import { MINIMUM_TARGET_PX } from "./touch-targets.ts";
import {
  IPHONE_15_VIEWPORT,
  LAPTOP_VIEWPORT,
  NARROWEST_VIEWPORT,
} from "./viewports.ts";
import { waitUntilSettled } from "./visual/visual-page.ts";

// The height of a button, as --target-size sets it in
// src/app/page-roles.css.
const BUTTON_HEIGHT_PX = 44;

// Where a target sits on the page, in CSS px, and the least height it may
// have.
interface Box {
  readonly top: number;
  readonly bottom: number;
  readonly height: number;
  readonly leastHeight: number;
}

// One of the header's targets, and the least height it may have.
interface HeaderTarget {
  readonly target: Locator;
  readonly leastHeight: number;
}

// The header's targets: the site's name, a line of text tall, and the
// buttons: Personas, Settings, Account and the theme picker.
function headerTargets(page: Page): readonly HeaderTarget[] {
  const header = page.getByRole("banner");
  return [
    {
      target: header.getByRole("link", { name: SITE_COPY.name }),
      leastHeight: MINIMUM_TARGET_PX,
    },
    ...[
      header.getByRole("link", { name: PERSONAS_COPY.headerLink }),
      header.getByRole("link", { name: SETTINGS_COPY.headerLink }),
      header.getByRole("link", { name: ACCOUNT_COPY.headerLink }),
      header.getByRole("button", { name: THEME_COPY.picker }),
    ].map((target) => ({ target, leastHeight: BUTTON_HEIGHT_PX })),
  ];
}

async function box({ target, leastHeight }: HeaderTarget): Promise<Box> {
  const bounds = await target.boundingBox();
  if (bounds === null) {
    throw new Error("A header target is not laid out");
  }
  return {
    top: bounds.y,
    bottom: bounds.y + bounds.height,
    height: bounds.height,
    leastHeight,
  };
}

// How many rows the boxes sit on: going down by top, a box starts a new row
// when it starts below the bottom of the row before.
function rowCount(boxes: readonly Box[]): number {
  const byTop = boxes.toSorted((one, other) => one.top - other.top);
  return byTop.reduce<{ rows: number; bottom: number }>(
    (rows, { top, bottom }) => {
      if (top >= rows.bottom) {
        return { rows: rows.rows + 1, bottom };
      }
      return { rows: rows.rows, bottom: Math.max(rows.bottom, bottom) };
    },
    { rows: 0, bottom: Number.NEGATIVE_INFINITY },
  ).rows;
}

// Runs in the browser: how wide the page's content is.
function pageScrollWidth(): number {
  return document.documentElement.scrollWidth;
}

// Signs in with theme saved, as the theme picker saves it, and opens the
// projects list once it has all of its content.
async function openProjects(
  page: Page,
  testData: TestData,
  baseUrl: string | undefined,
  theme: ThemeId,
): Promise<void> {
  if (baseUrl === undefined) {
    throw new Error("The header tests need the config's baseURL");
  }
  await page
    .context()
    .addCookies([
      { ...themeChoiceCookie({ theme, mode: "light" }), url: baseUrl },
    ]);
  await logIn(page, testData.account);
  await page.goto("/projects");
  await expect(page.locator("html")).toHaveAttribute(THEME_ATTRIBUTE, theme);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await waitUntilSettled(page);
}

// A screen the header is checked on, and the most rows it may take there.
interface HeaderScreen {
  readonly name: string;
  readonly viewport: ViewportSize;
  readonly phone: boolean;
  // Infinity where the ruling sets no row target (320 px).
  readonly mostRows: number;
}

const HEADER_SCREENS: readonly HeaderScreen[] = [
  {
    name: "an iPhone 15",
    viewport: IPHONE_15_VIEWPORT,
    phone: true,
    mostRows: 2,
  },
  {
    name: "the narrowest phone",
    viewport: NARROWEST_VIEWPORT,
    phone: true,
    mostRows: Number.POSITIVE_INFINITY,
  },
  { name: "a laptop", viewport: LAPTOP_VIEWPORT, phone: false, mostRows: 1 },
];

// How the header is laid out: its rows, its targets shorter than they may
// be, and how wide the page's content is.
interface HeaderLayout {
  readonly rows: number;
  readonly shortTargets: readonly Box[];
  readonly scrollWidth: number;
}

async function headerLayout(page: Page): Promise<HeaderLayout> {
  const boxes = await Promise.all(headerTargets(page).map(box));
  return {
    rows: rowCount(boxes),
    shortTargets: boxes.filter(
      ({ height, leastHeight }) => height < leastHeight,
    ),
    scrollWidth: await page.evaluate(pageScrollWidth),
  };
}

test.describe("use_case_use_on_phone", () => {
  for (const screen of HEADER_SCREENS) {
    test.describe(`the signed-in header on ${screen.name}`, () => {
      test.use({
        hasTouch: screen.phone,
        isMobile: screen.phone,
        viewport: screen.viewport,
      });

      for (const theme of THEME_IDS) {
        test(`in ${theme}`, async ({ page, testData, baseURL }) => {
          await openProjects(page, testData, baseURL, theme);
          const { rows, shortTargets, scrollWidth } = await headerLayout(page);

          expect(rows, "rows").toBeLessThanOrEqual(screen.mostRows);
          expect(
            shortTargets,
            `every button at least ${BUTTON_HEIGHT_PX} px tall, the site's name ${MINIMUM_TARGET_PX}`,
          ).toEqual([]);
          // Compared with the width set rather than innerWidth, because a
          // phone zooms out to fit content wider than its screen.
          expect(scrollWidth, "no sideways scroll").toBeLessThanOrEqual(
            screen.viewport.width,
          );
        });
      }
    });
  }
});
