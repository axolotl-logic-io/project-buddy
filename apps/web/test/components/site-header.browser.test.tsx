// "use_case_use_on_phone" in use-cases, the signed-in header, with its five
// links, in Chromium and WebKit: on an iPhone 15 it takes at most two rows in every theme, so
// the page starts high on the screen, and on a laptop one. Its buttons stay
// a touch target's height (44 px), the site's name at least WCAG 2.5.8's
// minimum (24 px), and nothing scrolls sideways. The header is laid out by
// width alone (no pointer media query in src/), so the test's viewport
// stands in for the phone. The theme fonts are loaded, since the row count
// depends on them. site-header-first-html.test.tsx checks that the server
// sends the header whole, and test/app/phone-pages.touch.browser.test.tsx
// every page's reflow and targets.
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { type Locator, page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { AccountLinks, SiteHeader } from "@/components/site-header.tsx";
import {
  DEFAULT_THEME_ATTRIBUTES,
  MODE_ATTRIBUTE,
  THEME_ATTRIBUTE,
} from "@/themes/theme-choice.ts";
import { THEME_IDS, type ThemeId } from "@/themes/themes.ts";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { BUDDIES_COPY } from "@/ui/copy/buddies.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";
import { SETTINGS_COPY } from "@/ui/copy/settings.ts";
import { SITE_COPY } from "@/ui/copy/site.ts";
import { THEME_COPY } from "@/ui/copy/theme.ts";
import {
  installThemeFonts,
  loadFonts,
} from "../themes/theme-fonts-test-kit.ts";
import {
  IPHONE_15_VIEWPORT,
  LAPTOP_VIEWPORT,
  MINIMUM_TARGET_PX,
  NARROWEST_VIEWPORT,
  type ViewportSize,
} from "../viewports-test-kit.ts";

// site-header.tsx reads the session for SignedInLinks, server code.
vi.mock(
  "@/auth/current-user.ts",
  () => import("../auth/current-user-test-kit.ts"),
);

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
// buttons: Chat, Projects, Buddies, Settings, Account and the theme picker.
function headerTargets(): readonly HeaderTarget[] {
  const header = page.getByRole("banner");
  return [
    {
      target: header.getByRole("link", { name: SITE_COPY.name }),
      leastHeight: MINIMUM_TARGET_PX,
    },
    ...[
      header.getByRole("link", { name: CHAT_COPY.headerLink, exact: true }),
      header.getByRole("link", { name: PROJECTS_COPY.headerLink, exact: true }),
      header.getByRole("link", { name: BUDDIES_COPY.headerLink }),
      header.getByRole("link", { name: SETTINGS_COPY.headerLink }),
      header.getByRole("link", { name: ACCOUNT_COPY.headerLink }),
      header.getByRole("button", { name: THEME_COPY.picker }),
    ].map((target) => ({ target, leastHeight: BUTTON_HEIGHT_PX })),
  ];
}

function box({ target, leastHeight }: HeaderTarget): Box {
  const { top, bottom, height } = target.element().getBoundingClientRect();
  return { top, bottom, height, leastHeight };
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

// A screen the header is checked on, and the fewest and most rows it may
// take there.
interface HeaderScreen {
  readonly name: string;
  readonly viewport: ViewportSize;
  readonly fewestRows: number;
  // Infinity where the ruling sets no row target (320 px).
  readonly mostRows: number;
}

const HEADER_SCREENS: readonly HeaderScreen[] = [
  {
    name: "an iPhone 15",
    viewport: IPHONE_15_VIEWPORT,
    fewestRows: 1,
    mostRows: 2,
  },
  {
    name: "the narrowest phone",
    viewport: NARROWEST_VIEWPORT,
    fewestRows: 1,
    mostRows: Number.POSITIVE_INFINITY,
  },
  { name: "a laptop", viewport: LAPTOP_VIEWPORT, fewestRows: 1, mostRows: 1 },
];

// How the header is laid out: its rows, its targets shorter than they may
// be, and how wide the page's content is.
interface HeaderLayout {
  readonly rows: number;
  readonly shortTargets: readonly Box[];
  readonly scrollWidth: number;
}

function headerLayout(): HeaderLayout {
  const boxes = headerTargets().map(box);
  return {
    rows: rowCount(boxes),
    shortTargets: boxes.filter(
      ({ height, leastHeight }) => height < leastHeight,
    ),
    scrollWidth: document.documentElement.scrollWidth,
  };
}

// Shows theme in Light mode, as the theme picker applies a choice.
function applyTheme(theme: ThemeId): void {
  const html = document.documentElement;
  for (const [name, value] of Object.entries(DEFAULT_THEME_ATTRIBUTES)) {
    html.setAttribute(name, value);
  }
  html.setAttribute(THEME_ATTRIBUTE, theme);
  html.setAttribute(MODE_ATTRIBUTE, "light");
}

beforeAll(() => {
  installThemeFonts();
});

afterEach(async () => {
  await page.viewport(LAPTOP_VIEWPORT.width, LAPTOP_VIEWPORT.height);
});

describe("use_case_use_on_phone", () => {
  for (const screen of HEADER_SCREENS) {
    describe(`the signed-in header on ${screen.name}`, () => {
      for (const theme of THEME_IDS) {
        test(`in ${theme}`, async () => {
          applyTheme(theme);
          await page.viewport(screen.viewport.width, screen.viewport.height);
          await render(<SiteHeader links={<AccountLinks />} />);
          await expect
            .element(page.getByRole("button", { name: THEME_COPY.picker }))
            .toBeVisible();
          await expect
            .poll(() => window.innerWidth, { message: "the viewport is set" })
            .toBe(screen.viewport.width);
          await loadFonts();

          const [title] = headerTargets();
          expect(
            getComputedStyle(title?.target.element() ?? document.body)
              .fontFamily,
            "the site's name is in a loaded theme font",
          ).toContain("test kit");
          const { rows, shortTargets, scrollWidth } = headerLayout();

          expect(rows, "rows").toBeGreaterThanOrEqual(screen.fewestRows);
          expect(rows, "rows").toBeLessThanOrEqual(screen.mostRows);
          expect(
            shortTargets,
            `every button at least ${BUTTON_HEIGHT_PX} px tall, the site's name ${MINIMUM_TARGET_PX}`,
          ).toEqual([]);
          expect(scrollWidth, "no sideways scroll").toBeLessThanOrEqual(
            screen.viewport.width,
          );
        });
      }
    });
  }
});
