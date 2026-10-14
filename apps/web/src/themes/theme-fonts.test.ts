/// <reference types="vite/client" />
// Only the default theme's fonts preload; the others download when a page
// first uses them. next/font needs each font's options written out as
// literals, so this reads theme-fonts.ts as text rather than deriving
// `preload` from DEFAULT_THEME_CHOICE.
import { expect, test } from "vitest";
import { themeReads } from "@/themes/theme-stylesheets.ts";
import { DEFAULT_THEME_CHOICE } from "@/themes/themes.ts";

const { "./theme-fonts.ts": FONTS_SOURCE = "" } = import.meta.glob<string>(
  "./theme-fonts.ts",
  { query: "?raw", import: "default", eager: true },
);

// Each font's options, as in `Nunito({ variable: "--typeface-nunito", ... })`.
const FONT_OPTIONS = /\(\{(?<options>[^}]*)\}\)/gu;
const TYPEFACE_VARIABLE = /variable: "--(?<name>typeface-[\w-]+)"/gu;
const NO_PRELOAD = /preload: false/u;
const TYPEFACE = /^typeface-/u;
// The next/font modules theme-fonts.ts imports from.
const FONT_MODULE = /from "(?<module>next\/font\/[\w-]+)"/gu;
// Each font's file, as in `src: "./fonts/nunito/nunito-latin-wght-normal.woff2"`.
const FONT_SRC = /src: "(?<path>\.\/fonts\/[\w-]+\/[\w.-]+\.woff2)"/gu;

// The font files and licences in the repo; only the keys are used.
const FONT_FILES = new Set(Object.keys(import.meta.glob("./fonts/*/*.woff2")));
const LICENCES = new Set(Object.keys(import.meta.glob("./fonts/*/OFL.txt")));

// The typeface variable a font's options set, or "" if none.
function typefaceVariable(options: string): string {
  const [name = ""] = [...options.matchAll(TYPEFACE_VARIABLE)].map(
    ({ groups: { name: variable = "" } = {} }) => variable,
  );
  return name;
}

// Each font in theme-fonts.ts: the typeface variable it sets and whether it
// preloads.
const FONTS = [...FONTS_SOURCE.matchAll(FONT_OPTIONS)].map(
  ({ groups: { options = "" } = {} }) => ({
    typeface: typefaceVariable(options),
    preloads: !NO_PRELOAD.test(options),
  }),
);

test("only the default theme's fonts preload", () => {
  const defaultTypefaces = [...themeReads(DEFAULT_THEME_CHOICE.theme)].filter(
    (name) => TYPEFACE.test(name),
  );
  expect(defaultTypefaces.length).toBeGreaterThan(0);
  expect(FONTS.length).toBeGreaterThan(defaultTypefaces.length);
  expect(FONTS.filter(({ typeface }) => typeface === "")).toEqual([]);

  expect(
    new Set(
      FONTS.filter(({ preloads }) => preloads).map(({ typeface }) => typeface),
    ),
  ).toEqual(new Set(defaultTypefaces));
});

test("every font is self-hosted with its licence beside it", () => {
  // next/font/local only: no font is fetched from Google Fonts at build time.
  expect(
    [...FONTS_SOURCE.matchAll(FONT_MODULE)].map(
      ({ groups: { module = "" } = {} }) => module,
    ),
  ).toEqual(["next/font/local"]);

  const paths = [...FONTS_SOURCE.matchAll(FONT_SRC)].map(
    ({ groups: { path = "" } = {} }) => path,
  );
  expect(paths.length).toBeGreaterThan(0);
  expect(paths).toHaveLength(FONTS.length);
  expect(paths.filter((path) => !FONT_FILES.has(path))).toEqual([]);

  const directories = paths.map((path) => path.slice(0, path.lastIndexOf("/")));
  expect(
    directories.filter((directory) => !LICENCES.has(`${directory}/OFL.txt`)),
  ).toEqual([]);
});
