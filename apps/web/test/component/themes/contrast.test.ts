// Every selectable appearance passes WCAG AA for each pair of
// colour tokens that meet on the page. The tokens and their values are read
// from the CSS itself: contract.css names the colour tokens, and each
// theme's file gives every appearance its own values. contract.test.ts
// checks that each mode shows the values for that mode.

import { displayable, parse, wcagContrast } from "culori";
import { describe, expect, test } from "vitest";
import { THEME_IDS, THEME_MODES } from "@/themes/themes.ts";
import {
  COLOR_TOKENS,
  themeTokens,
} from "../../support/themes/theme-stylesheets.ts";

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
  ...pairs("header-paper", ["header-ink"], TEXT_CONTRAST),
  ...pairs("header-gold", ["header-ink"], TEXT_CONTRAST),
  ...pairs("header-ink", ["header-gold"], TEXT_CONTRAST),
];

describe.each(THEME_IDS)("the %s theme", (themeId) => {
  const values = themeTokens(themeId);

  function color(mode: string, token: string): string {
    return values.get(`${mode}-${token}`) ?? "";
  }

  test.each(THEME_MODES)("sets every colour token in %s mode", (mode) => {
    expect(COLOR_TOKENS.length).toBeGreaterThan(0);
    for (const token of COLOR_TOKENS) {
      const value = color(mode, token);
      expect(parse(value), `${mode}-${token}: ${value}`).toBeDefined();
      expect(displayable(value), `${mode}-${token} is in sRGB`).toBe(true);
    }
  });

  test.each(THEME_MODES)("passes WCAG AA in %s mode", (mode) => {
    for (const { front, back, minimum } of PAIRS) {
      const ratio = wcagContrast(color(mode, front), color(mode, back));
      expect(ratio, `${front} on ${back}`).toBeGreaterThanOrEqual(minimum);
    }
  });
});
