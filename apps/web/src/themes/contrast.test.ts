// Every registered theme, in both modes, passes WCAG AA for each pair of
// colour tokens that meet on the page. The tokens and their values are read
// from the CSS itself: contract.css names the colour tokens, and each
// theme's file gives every one a light and a dark value. contract.test.ts
// checks that each mode shows the values for that mode.
import { displayable, parse, wcagContrast } from "culori";
import { describe, expect, test } from "vitest";
import { COLOR_TOKENS, themeTokens } from "@/themes/theme-stylesheets.ts";
import { THEME_IDS } from "@/themes/themes.ts";

interface Pair {
  // The token in front: text, an icon, a border or the focus outline.
  readonly front: string;
  // The token behind it.
  readonly back: string;
  readonly minimum: number;
}

const MODES = ["light", "dark"] as const;

// WCAG AA: body text, and large text or the boundary of a control.
const TEXT_CONTRAST = 4.5;
const BOUNDARY_CONTRAST = 3;

const TEXT_SURFACES = ["background", "surface", "field"];
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
  ...pairs("primary", ["background", "surface"], TEXT_CONTRAST),
  ...pairs("on-primary", ["primary"], TEXT_CONTRAST),
  ...pairs("on-accent", ["accent"], TEXT_CONTRAST),
  // The highlighted item of a menu stands out from the menu.
  ...pairs("accent", ["surface"], BOUNDARY_CONTRAST),
  ...CODE_COLORS.flatMap((code) =>
    pairs(code, ["code-surface"], TEXT_CONTRAST),
  ),
  ...pairs("line", ["background", "surface"], BOUNDARY_CONTRAST),
  ...pairs("focus", ["background", "surface"], BOUNDARY_CONTRAST),
];

describe.each(THEME_IDS)("the %s theme", (themeId) => {
  const values = themeTokens(themeId);

  function color(mode: string, token: string): string {
    return values.get(`${mode}-${token}`) ?? "";
  }

  test.each(MODES)("sets every colour token in %s mode", (mode) => {
    expect(COLOR_TOKENS.length).toBeGreaterThan(0);
    for (const token of COLOR_TOKENS) {
      const value = color(mode, token);
      expect(parse(value), `${mode}-${token}: ${value}`).toBeDefined();
      expect(displayable(value), `${mode}-${token} is in sRGB`).toBe(true);
    }
  });

  test.each(MODES)("passes WCAG AA in %s mode", (mode) => {
    for (const { front, back, minimum } of PAIRS) {
      const ratio = wcagContrast(color(mode, front), color(mode, back));
      expect(ratio, `${front} on ${back}`).toBeGreaterThanOrEqual(minimum);
    }
  });
});
