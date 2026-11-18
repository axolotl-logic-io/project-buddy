// The token contract's shape, read from the CSS itself: themes.css loads
// every stylesheet in src/themes and each registered theme into the themes
// layer, and the contract's utilities read tokens rather than spelling out
// colours. The values each theme gives each appearance are checked in the
// browser, through the real cascade, by theme-tokens.browser.test.tsx, so
// neither file depends on how a theme lays out its CSS.

import { describe, expect, test } from "vitest";
import { THEME_IDS } from "@/themes/themes.ts";
import {
  colorUtilities,
  loadedStylesheets,
  namedFor,
  THEME_STYLESHEET_NAMES,
  themeImports,
  themeSetTokens,
} from "../../support/themes/theme-stylesheets.ts";

// The layer themes.css imports each theme into.
const THEMES_LAYER = "themes";

// A utility's value that reads one token, such as "var(--surface)".
const TOKEN_READ = /^var\(--[\w-]+\)$/u;

const THEME_SET_TOKENS = themeSetTokens();

describe("themes.css", () => {
  test("loads every stylesheet in src/themes", () => {
    const loaded = loadedStylesheets();
    expect(
      THEME_STYLESHEET_NAMES.filter((name) => !loaded.has(name)),
      "stylesheets in src/themes that themes.css never imports, directly or through another stylesheet",
    ).toEqual([]);
  });

  test("imports each registered theme, and only those, into the themes layer", () => {
    const themeLayerImports = [...themeImports()]
      .filter(([, layer]) => layer === THEMES_LAYER)
      .map(([name]) => name);
    for (const themeId of THEME_IDS) {
      expect(
        themeLayerImports.filter((name) => namedFor(themeId, name)),
        `themes.css imports a stylesheet named for ${themeId} into layer(${THEMES_LAYER})`,
      ).not.toEqual([]);
    }
    expect(
      themeLayerImports.filter(
        (name) => !THEME_IDS.some((themeId) => namedFor(themeId, name)),
      ),
      "stylesheets in the themes layer that no registered theme is named for (register the theme in src/themes/themes.ts)",
    ).toEqual([]);
  });
});

describe("contract.css", () => {
  test("reads tokens that the themes set, including the spacing unit and heading sizes", () => {
    expect(THEME_SET_TOKENS).toEqual(
      expect.arrayContaining([
        "space-unit",
        "control-radius",
        "site-title-size",
        "page-heading-size",
        "section-heading-size",
      ]),
    );
  });

  test("gives every colour utility a token rather than a colour of its own", () => {
    const utilities = [...colorUtilities()];
    expect(utilities.length).toBeGreaterThan(0);
    expect(
      utilities.filter(([, value]) => !TOKEN_READ.test(value)),
      "colour utilities that don't read a single token with var(--token)",
    ).toEqual([]);
  });
});
