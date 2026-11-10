// Every registered theme, in both modes, passes WCAG AA for each pair of
// colour tokens that meet on the page. The tokens and their values are read
// from the CSS itself: contract.css names the colour tokens, and each
// theme's file gives every one a light and a dark value. contract.test.ts
// checks that each mode shows the values for that mode.
import { converter, displayable, parse, wcagContrast } from "culori";
import { describe, expect, test } from "vitest";
import { THEME_IDS } from "@/themes/themes.ts";
import {
  COLOR_TOKENS,
  contractTokens,
  themeTokens,
} from "../../support/themes/theme-stylesheets.ts";

interface Pair {
  // The token in front: text, an icon, a border or the focus outline.
  readonly front: string;
  // The token behind it.
  readonly back: string;
  readonly minimum: number;
}

const TOKEN_REFERENCE = /^var\(--(?<token>[\w-]+)\)$/u;

const MODES = ["light", "dark"] as const;

// WCAG AA: body text, and large text or the boundary of a control.
const TEXT_CONTRAST = 4.5;
const PERCENT_SCALE = 100;
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
  ...pairs("on-danger", ["danger"], TEXT_CONTRAST),
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

// The illustrated atlas follows the active semantic palette.
// Check opaque fallback paper and tinted paper over the darkest and lightest
// possible artwork, so readability never depends on blur support.
describe.each(MODES)("the atlas material in %s mode", (mode) => {
  const palette = themeTokens("parchment");
  const values = new Map(
    [...contractTokens()].map(([name, value]) => {
      const { token } = TOKEN_REFERENCE.exec(value)?.groups ?? {};
      if (token !== undefined) {
        return [name, palette.get(`${mode}-${token}`) ?? ""];
      }
      return [name, value];
    }),
  );
  const paper = values.get("atlas-paper") ?? "";
  test.each([
    { token: "atlas-ink", minimum: TEXT_CONTRAST },
    { token: "atlas-muted", minimum: TEXT_CONTRAST },
    { token: "atlas-line", minimum: BOUNDARY_CONTRAST },
    { token: "atlas-focus", minimum: BOUNDARY_CONTRAST },
  ])("$token is readable on paper", ({ token, minimum }) => {
    expect(wcagContrast(values.get(token) ?? "", paper)).toBeGreaterThanOrEqual(
      minimum,
    );
  });

  const rgb = converter("rgb");
  const paperColor = rgb(paper);
  const opacity =
    Number.parseFloat(values.get("atlas-frost-opacity") ?? "") / PERCENT_SCALE;
  const artworkExtremes = [0, 1];
  test.each(artworkExtremes)(
    "keeps text and focus readable over artwork at %s brightness",
    (brightness) => {
      if (paperColor === undefined) {
        throw new Error("Atlas paper must be a valid colour");
      }
      expect(opacity).toBeGreaterThan(0);
      expect(opacity).toBeLessThanOrEqual(1);
      const background = {
        mode: "rgb",
        r: paperColor.r * opacity + brightness * (1 - opacity),
        g: paperColor.g * opacity + brightness * (1 - opacity),
        b: paperColor.b * opacity + brightness * (1 - opacity),
      } satisfies Parameters<typeof wcagContrast>[1];
      for (const token of ["atlas-ink", "atlas-muted"]) {
        expect(
          wcagContrast(values.get(token) ?? "", background),
          token,
        ).toBeGreaterThanOrEqual(TEXT_CONTRAST);
      }
      for (const token of ["atlas-line", "atlas-focus"]) {
        expect(
          wcagContrast(values.get(token) ?? "", background),
          token,
        ).toBeGreaterThanOrEqual(BOUNDARY_CONTRAST);
      }
    },
  );

  // Focus outlines sit outside the panels, directly over the washed artwork.
  test.each(artworkExtremes)(
    "keeps outside focus visible over washed artwork at %s brightness",
    (brightness) => {
      const wash = rgb(palette.get(`${mode}-background`) ?? "");
      const washOpacity =
        Number.parseFloat(palette.get("home-wash-opacity") ?? "") /
        PERCENT_SCALE;
      if (wash === undefined) {
        throw new Error("Home wash must be a valid colour");
      }
      expect(washOpacity).toBeGreaterThan(0);
      expect(washOpacity).toBeLessThanOrEqual(1);
      const background = {
        mode: "rgb",
        r: wash.r * washOpacity + brightness * (1 - washOpacity),
        g: wash.g * washOpacity + brightness * (1 - washOpacity),
        b: wash.b * washOpacity + brightness * (1 - washOpacity),
      } satisfies Parameters<typeof wcagContrast>[1];
      expect(
        wcagContrast(values.get("atlas-focus") ?? "", background),
      ).toBeGreaterThanOrEqual(BOUNDARY_CONTRAST);
    },
  );

  test("the Continue button remains readable", () => {
    expect(
      wcagContrast(
        values.get("atlas-paper") ?? "",
        values.get("atlas-ink") ?? "",
      ),
    ).toBeGreaterThanOrEqual(TEXT_CONTRAST);
  });
});

// The shared HUD keeps a separate stable palette in both modes.
describe("the shared HUD", () => {
  const values = themeTokens("parchment");
  test.each([
    { front: "header-paper", back: "header-ink", minimum: TEXT_CONTRAST },
    { front: "header-gold", back: "header-ink", minimum: TEXT_CONTRAST },
    { front: "header-ink", back: "header-gold", minimum: TEXT_CONTRAST },
  ])("$front is readable on $back", ({ front, back, minimum }) => {
    expect(
      wcagContrast(values.get(front) ?? "", values.get(back) ?? ""),
    ).toBeGreaterThanOrEqual(minimum);
  });
});
