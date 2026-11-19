// Every registered theme sets, for each selectable appearance, every token
// the contract reads; every colour token shows a colour in sRGB; each pair of
// colour tokens that meet on the page passes WCAG AA; and its headings step
// down in size from the site's title to body text. The values are read from
// the page, through the real cascade, so a theme may lay out its CSS however
// it likes (one file, one per appearance, values set per mode or through
// --<mode>-* indirection). Which tokens exist is read from the contract
// (theme-stylesheets.ts); a pair or size below that names a token the
// contract no longer has fails saying so, so the list here is updated rather
// than silently skipped.

import { displayable, formatHex, parse, wcagContrast } from "culori";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { THEME_IDS, THEME_MODES, type ThemeId } from "@/themes/themes.ts";
import {
  colorTokens,
  themeSetTokens,
} from "../../support/themes/theme-stylesheets.ts";
import { applyTheme } from "./theme-test-kit.ts";

interface Pair {
  // The token in front: text, an icon, a border or the focus outline.
  readonly front: string;
  // The token behind it.
  readonly back: string;
  readonly minimum: number;
}

// WCAG AA: body text, and large text or the boundary of a control.
const TEXT_CONTRAST = 4.5;
const BOUNDARY_CONTRAST = 3;

const TEXT_SURFACES = [
  "background",
  "surface",
  "field",
  "navigation-surface",
  "trail-surface",
  "sidebar-surface",
  "secondary-surface",
];
const CODE_COLORS = [
  "code-comment",
  "code-keyword",
  "code-string",
  "code-function",
  "code-constant",
];

function pairs(
  front: string,
  backs: readonly string[],
  minimum: number,
): Pair[] {
  return backs.map((back) => ({ front, back, minimum }));
}

const PAIRS: readonly Pair[] = [
  ...pairs("foreground", [...TEXT_SURFACES, "code-surface"], TEXT_CONTRAST),
  ...pairs("muted", TEXT_SURFACES, TEXT_CONTRAST),
  ...pairs("danger", TEXT_SURFACES, TEXT_CONTRAST),
  ...pairs("primary", TEXT_SURFACES, TEXT_CONTRAST),
  ...pairs("action-ink", ["action-paper", ...TEXT_SURFACES], TEXT_CONTRAST),
  ...pairs("on-action", ["action-fill"], TEXT_CONTRAST),
  ...pairs("line", ["action-paper"], BOUNDARY_CONTRAST),
  ...pairs("focus", ["action-paper"], BOUNDARY_CONTRAST),
  ...pairs("on-primary", ["primary"], TEXT_CONTRAST),
  ...pairs("on-danger", ["danger"], TEXT_CONTRAST),
  ...pairs("on-accent", ["accent"], TEXT_CONTRAST),
  // The highlighted item of a menu stands out from the menu.
  ...pairs("accent", ["surface"], BOUNDARY_CONTRAST),
  ...CODE_COLORS.flatMap((code) =>
    pairs(code, ["code-surface"], TEXT_CONTRAST),
  ),
  ...pairs("line", TEXT_SURFACES, BOUNDARY_CONTRAST),
  ...pairs("focus", TEXT_SURFACES, BOUNDARY_CONTRAST),
  ...pairs("label-ink", ["background", "field", "surface"], TEXT_CONTRAST),
  ...pairs("header-focus", ["header-ink"], BOUNDARY_CONTRAST),
  ...pairs("ring-ink", ["ring-disc"], TEXT_CONTRAST),
  ...pairs("ring-arc", ["ring-disc"], BOUNDARY_CONTRAST),
  ...pairs("header-paper", ["header-ink"], TEXT_CONTRAST),
  ...pairs("header-gold", ["header-ink"], TEXT_CONTRAST),
  ...pairs("header-ink", ["header-gold"], TEXT_CONTRAST),
];

// The heading sizes a theme sets, from the largest role to the smallest:
// the site's title, a page's heading and a section's heading. The site's
// title has a second size for wide screens, and a page's heading a smaller
// one for phones, below sm.
const SITE_TITLE = "site-title-size";
const WIDE_SITE_TITLE = "site-title-wide-size";
const PAGE_HEADING = "page-heading-size";
const PHONE_PAGE_HEADING = "page-heading-phone-size";
const SECTION_HEADING = "section-heading-size";
// The titles that aren't a page's headings: the site's name in the header,
// smaller than a page's heading, and a card's title, such as a quest's name
// in the list, smaller than a section's heading.
const HEADER_TITLE = "header-title-size";
const CARD_TITLE = "card-title-size";

// A page's heading stands clearly above a section's heading: at least this
// many times its size.
const PAGE_OVER_SECTION_HEADING = 1.2;

const THIS_FILE = "theme-tokens.browser.test.tsx";
// The colour tokens: those the contract's colour utilities read, and the
// colour of shadows, which only the shadow tokens read (themes.ts).
const COLOR_TOKENS: readonly string[] = [
  ...colorTokens(),
  "shadow",
  "label-ink",
  "header-focus",
  "ring-ink",
  "ring-arc",
  "ring-disc",
];
const THEME_SET_TOKENS = themeSetTokens();

let probe: HTMLElement;

beforeEach(() => {
  probe = document.createElement("div");
  document.body.append(probe);
});

afterEach(() => {
  probe.remove();
});

// The value the page gives --<token> under the applied theme, or "" if none.
function tokenValue(token: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(`--${token}`)
    .trim();
}

// The colour --<token> shows, as the browser computes it.
function color(token: string): string {
  if (!COLOR_TOKENS.includes(token)) {
    throw new Error(
      `--${token} is not one of the contract's colour tokens (${COLOR_TOKENS.join(", ")}); update the pairs in ${THIS_FILE}`,
    );
  }
  probe.style.backgroundColor = `var(--${token})`;
  return getComputedStyle(probe).backgroundColor;
}

// The size --<token> sets text to, in px.
function size(token: string): number {
  if (tokenValue(token) === "") {
    throw new Error(
      `--${token} is unset; if the contract renamed or dropped it, update the heading sizes in ${THIS_FILE}`,
    );
  }
  probe.style.fontSize = `var(--${token})`;
  return Number.parseFloat(getComputedStyle(probe).fontSize);
}

// Body text's size, in px: every heading is larger.
function bodySize(): number {
  probe.style.fontSize = "1rem";
  return Number.parseFloat(getComputedStyle(probe).fontSize);
}

// Every colour token's colour under the applied theme, as hex.
function palette(): string[] {
  return COLOR_TOKENS.map((token) => formatHex(color(token)) ?? "");
}

describe.each(THEME_IDS)("the %s theme", (themeId: ThemeId) => {
  describe.each(THEME_MODES)("in %s mode", (mode) => {
    beforeEach(() => {
      applyTheme(themeId, mode);
    });

    test("sets every token the contract reads", () => {
      expect(THEME_SET_TOKENS.length).toBeGreaterThan(0);
      expect(
        THEME_SET_TOKENS.filter((token) => tokenValue(token) === ""),
        "tokens the contract reads that this appearance leaves unset",
      ).toEqual([]);
    });

    test("sets every colour token to a colour in sRGB", () => {
      expect(COLOR_TOKENS.length).toBeGreaterThan(0);
      for (const token of COLOR_TOKENS) {
        expect(tokenValue(token), `--${token} is set`).not.toBe("");
        const value = color(token);
        expect(parse(value), `--${token}: ${value}`).toBeDefined();
        expect(displayable(value), `--${token} (${value}) is in sRGB`).toBe(
          true,
        );
      }
    });

    test("passes WCAG AA", () => {
      for (const { front, back, minimum } of PAIRS) {
        const ratio = wcagContrast(color(front), color(back));
        expect(ratio, `${front} on ${back}`).toBeGreaterThanOrEqual(minimum);
      }
    });

    test("sizes its headings from the site's title down, all above body text", () => {
      const sizes = [
        size(SITE_TITLE),
        size(PAGE_HEADING),
        size(SECTION_HEADING),
        bodySize(),
      ];
      const larger = sizes.slice(0, -1);
      for (const [index, smaller] of sizes.slice(1).entries()) {
        expect(larger[index], sizes.join(" > ")).toBeGreaterThan(smaller);
      }
      expect(size(WIDE_SITE_TITLE)).toBeGreaterThanOrEqual(size(SITE_TITLE));
    });

    test("sets a page's heading clearly larger than a section's", () => {
      expect(size(PAGE_HEADING) / size(SECTION_HEADING)).toBeGreaterThanOrEqual(
        PAGE_OVER_SECTION_HEADING,
      );
    });

    test("sets a page's heading on a phone no larger, and still clearly above a section's", () => {
      const phone = size(PHONE_PAGE_HEADING);
      expect(phone).toBeLessThanOrEqual(size(PAGE_HEADING));
      expect(phone / size(SECTION_HEADING)).toBeGreaterThanOrEqual(
        PAGE_OVER_SECTION_HEADING,
      );
    });

    test("sets the header's title below a page's heading, and a card's below a section's", () => {
      const headerTitle = size(HEADER_TITLE);
      const cardTitle = size(CARD_TITLE);
      expect(headerTitle).toBeLessThan(size(PAGE_HEADING));
      expect(headerTitle).toBeGreaterThan(bodySize());
      expect(cardTitle).toBeLessThan(size(SECTION_HEADING));
      expect(cardTitle).toBeGreaterThanOrEqual(bodySize());
    });
  });

  test("keeps text sizes and border widths consistent across appearances", () => {
    const sizes = THEME_MODES.map((mode) => {
      applyTheme(themeId, mode);
      return [
        ...[
          SITE_TITLE,
          WIDE_SITE_TITLE,
          PAGE_HEADING,
          PHONE_PAGE_HEADING,
          SECTION_HEADING,
          HEADER_TITLE,
          CARD_TITLE,
          "conversation-text-size",
          "initial-size",
          "timer-phase-size",
          "timer-number-size",
          "timer-hours-size",
        ].map(size),
        ...[
          "line-width",
          "action-line-width",
          "frame-width",
          "frame-keyline",
          "rule-width",
        ].map(tokenValue),
      ];
    });
    for (const appearance of sizes) {
      expect(appearance).toEqual(sizes[0]);
    }
  });

  test("gives each appearance a palette of its own", () => {
    const palettes = THEME_MODES.map((mode) => {
      applyTheme(themeId, mode);
      return { mode, colors: palette().join(" ") };
    });
    for (const [index, { mode, colors }] of palettes.entries()) {
      for (const other of palettes.slice(index + 1)) {
        expect(colors, `${mode} and ${other.mode} differ`).not.toBe(
          other.colors,
        );
      }
    }
  });
});
