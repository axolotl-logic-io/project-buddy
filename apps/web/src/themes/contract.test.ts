// The token contract holds for every theme: each registered theme is
// imported and sets every token contract.css reads, and each mode shows
// every colour token's value for that mode. The contract and the themes are
// read from the CSS itself.
import { describe, expect, test } from "vitest";
import {
  COLOR_TOKENS,
  contractReads,
  contractTokens,
  modeColorMappings,
  THEME_STYLESHEET_NAMES,
  themeImports,
  themeTokens,
} from "@/themes/theme-stylesheets.ts";
import { THEME_IDS } from "@/themes/themes.ts";

// The layer themes.css imports each theme into.
const THEMES_LAYER = "themes";

// The tokens a theme must set: every one contract.css reads but doesn't set.
const THEME_SET_TOKENS: readonly string[] = [...contractReads()].filter(
  (token) => !contractTokens().has(token),
);

// The heading sizes a theme sets, from the largest role to the smallest:
// the site's title, a page's heading and a section's heading. The site's
// title has a second size for wide screens.
const HEADING_SIZE_TOKENS = [
  "site-title-size",
  "page-heading-size",
  "section-heading-size",
] as const;
const WIDE_SITE_TITLE_TOKEN = "site-title-wide-size";

// A page's heading stands clearly above a section's heading: at least this
// many times its size.
const PAGE_OVER_SECTION_HEADING = 1.2;

// The titles that aren't a page's headings: the site's name in the header,
// smaller than a page's heading, and a card's title, such as a project's
// name in the list, smaller than a section's heading.
const HEADER_TITLE_TOKEN = "header-title-size";
const CARD_TITLE_TOKEN = "card-title-size";

// Body text's size, in rem: every heading is larger.
const BODY_TEXT_REM = 1;

// A size such as "1.25rem", in rem; NaN if it isn't one.
const REM_SIZE = /^(?<rem>\d+(?:\.\d+)?)rem$/u;

function remSize(value: string | undefined): number {
  const { rem = "" } = REM_SIZE.exec(value ?? "")?.groups ?? {};
  return Number.parseFloat(rem);
}

// The colour tokens each mode shows, and whose values they should be.
const { light, dark, systemDark } = modeColorMappings();
const MODE_RULES = [
  { name: "Light", values: "light", mappings: light },
  { name: "Dark", values: "dark", mappings: dark },
  {
    name: "System when the system is dark",
    values: "dark",
    mappings: systemDark,
  },
] as const;

describe("themes.css", () => {
  test("imports every other stylesheet in src/themes", () => {
    expect(new Set(themeImports().keys())).toEqual(
      new Set(THEME_STYLESHEET_NAMES.filter((name) => name !== "themes")),
    );
  });

  test("imports exactly the registered themes into the themes layer", () => {
    const themeLayerImports = [...themeImports()]
      .filter(([, layer]) => layer === THEMES_LAYER)
      .map(([name]) => name);
    expect(new Set(themeLayerImports)).toEqual(new Set(THEME_IDS));
  });
});

describe("contract.css", () => {
  test("reads tokens that the themes set, including the spacing unit and heading sizes", () => {
    expect(THEME_SET_TOKENS).toContain("space-unit");
    expect(THEME_SET_TOKENS).toEqual(
      expect.arrayContaining([
        ...HEADING_SIZE_TOKENS,
        WIDE_SITE_TITLE_TOKEN,
        HEADER_TITLE_TOKEN,
        CARD_TITLE_TOKEN,
      ]),
    );
    expect(THEME_SET_TOKENS).toContain("control-radius");
    expect(THEME_SET_TOKENS).toContain("light-background");
  });

  test.each(MODE_RULES)(
    "under $name, sets exactly the colour tokens to their $values values",
    ({ mappings, values }) => {
      expect(Object.fromEntries(mappings)).toEqual(
        Object.fromEntries(
          COLOR_TOKENS.map((token) => [token, `var(--${values}-${token})`]),
        ),
      );
    },
  );

  test("gives every colour utility a colour token", () => {
    const utilityColors = [...contractTokens()]
      .filter(([name]) => name.startsWith("color-"))
      .map(([, value]) => value);
    expect(utilityColors.length).toBeGreaterThan(0);
    for (const value of utilityColors) {
      expect(COLOR_TOKENS.map((token) => `var(--${token})`)).toContain(value);
    }
  });
});

describe.each(THEME_IDS)("the %s theme", (themeId) => {
  test("sets every token contract.css reads", () => {
    const tokens = themeTokens(themeId);
    expect(THEME_SET_TOKENS.filter((token) => !tokens.has(token))).toEqual([]);
  });

  test("sizes its headings from the site's title down, all above body text", () => {
    const tokens = themeTokens(themeId);
    const sizes = [
      ...HEADING_SIZE_TOKENS.map((token) => remSize(tokens.get(token))),
      BODY_TEXT_REM,
    ];
    const larger = sizes.slice(0, -1);
    for (const [index, size] of sizes.slice(1).entries()) {
      expect(larger[index], sizes.join(" > ")).toBeGreaterThan(size);
    }
    expect(remSize(tokens.get(WIDE_SITE_TITLE_TOKEN))).toBeGreaterThanOrEqual(
      remSize(tokens.get("site-title-size")),
    );
  });

  test("sets a page's heading clearly larger than a section's", () => {
    const tokens = themeTokens(themeId);
    expect(
      remSize(tokens.get("page-heading-size")) /
        remSize(tokens.get("section-heading-size")),
    ).toBeGreaterThanOrEqual(PAGE_OVER_SECTION_HEADING);
  });

  test("sets the header's title below a page's heading, and a card's below a section's", () => {
    const tokens = themeTokens(themeId);
    const headerTitle = remSize(tokens.get(HEADER_TITLE_TOKEN));
    const cardTitle = remSize(tokens.get(CARD_TITLE_TOKEN));
    expect(headerTitle).toBeLessThan(remSize(tokens.get("page-heading-size")));
    expect(headerTitle).toBeGreaterThan(BODY_TEXT_REM);
    expect(cardTitle).toBeLessThan(remSize(tokens.get("section-heading-size")));
    expect(cardTitle).toBeGreaterThanOrEqual(BODY_TEXT_REM);
  });
});
