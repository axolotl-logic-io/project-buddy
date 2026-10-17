// The check of theme-font-urls.ts against the build, on CSS shaped as
// Turbopack builds next/font's: a class setting each typeface's variable to
// its family, and an `@font-face` rule loading the family's file from
// `../media/`, relative to the sheet in `.next/static/chunks/`.
import { describe, expect, test } from "vitest";
import { TYPEFACE_FONT_URLS } from "../src/themes/theme-font-urls.ts";
import { type BuiltSheet, buildFontUrlDrift } from "./build-font-urls.ts";

const MEDIA = "/_next/static/media/";
// A typeface of the map, and one whose family another's variable takes.
const TYPEFACE = "typeface-nunito";
const OTHER_TYPEFACE = "typeface-oswald";

// The CSS a build makes for typefaces, each with the file at its URL.
function builtCss(typefaces: Readonly<Record<string, string>>): string {
  return Object.entries(typefaces)
    .map(([typeface, url]) => {
      const family = `${typeface}-family`;
      const file = url.replace(MEDIA, "../media/");
      return [
        `.${typeface}-variable{--${typeface}:"${family}", "${family} Fallback"}`,
        `@font-face{font-family:${family};src:url(${file})format("woff2");font-display:swap}`,
        `@font-face{font-family:${family} Fallback;src:local(Arial)}`,
      ].join("\n");
    })
    .join("\n");
}

// The build's stylesheets: the theme contract's defaults, and next/font's.
function builtSheets(fonts: string): BuiltSheet[] {
  return [
    {
      path: "chunks/contract.css",
      text: `:root{--${TYPEFACE}:system-ui, sans-serif}`,
    },
    { path: "chunks/fonts.css", text: fonts },
  ];
}

// The map's URL for typeface.
function mapUrl(typeface: string): string {
  return TYPEFACE_FONT_URLS[typeface] ?? "";
}

describe("check:build-fonts", () => {
  test("passes a build whose @font-face files are the map's", () => {
    expect(
      buildFontUrlDrift(builtSheets(builtCss(TYPEFACE_FONT_URLS))),
    ).toEqual([]);
  });

  test("fails a build that hashes a font file differently", () => {
    const rebuilt = mapUrl(TYPEFACE).replace(".woff2", "x.woff2");

    const drift = buildFontUrlDrift(
      builtSheets(builtCss({ ...TYPEFACE_FONT_URLS, [TYPEFACE]: rebuilt })),
    );

    expect(drift).toEqual([
      expect.stringContaining(mapUrl(TYPEFACE)),
      expect.stringContaining(rebuilt),
    ]);
  });

  test("fails a build with a font file the map lacks", () => {
    const extra = `${MEDIA}extra_latin-s.0123456789abc.woff2`;
    const fonts = `${builtCss(TYPEFACE_FONT_URLS)}\n@font-face{font-family:extra;src:url(../media/extra_latin-s.0123456789abc.woff2)format("woff2")}`;

    const drift = buildFontUrlDrift(builtSheets(fonts));

    expect(drift).toEqual([expect.stringContaining(extra)]);
  });

  test("fails a build whose variable names another typeface's family", () => {
    const fonts = builtCss(TYPEFACE_FONT_URLS).replace(
      `--${TYPEFACE}:"${TYPEFACE}-family"`,
      `--${TYPEFACE}:"${OTHER_TYPEFACE}-family"`,
    );

    const drift = buildFontUrlDrift(builtSheets(fonts));

    expect(drift).toEqual([expect.stringContaining(mapUrl(TYPEFACE))]);
  });

  test("fails when there is no built CSS", () => {
    expect(buildFontUrlDrift([])).not.toEqual([]);
  });
});
