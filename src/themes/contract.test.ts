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
  test("reads tokens that the themes set, including the spacing unit", () => {
    expect(THEME_SET_TOKENS).toContain("space-unit");
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
});
