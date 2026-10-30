/// <reference types="vite/client" />
// No font preloads through next/font: the proxy sends preload hints for the
// saved theme's fonts from theme-font-urls.ts. next/font needs each font's
// options written out as literals, so this reads theme-fonts.ts as text.
import { expect, test } from "vitest";
import {
  THEME_TYPEFACES,
  TYPEFACE_FONT_URLS,
} from "@/themes/theme-font-urls.ts";
import { THEMES } from "@/themes/themes.ts";
import { themeReads } from "../../support/themes/theme-stylesheets.ts";

const { "./theme-fonts.ts": FONTS_SOURCE = "" } = import.meta.glob<string>(
  "./theme-fonts.ts",
  { base: "/src/themes", query: "?raw", import: "default", eager: true },
);

// Each font's options, as in `Nunito({ variable: "--typeface-nunito", ... })`.
const FONT_OPTIONS = /\(\{(?<options>[^}]*)\}\)/gu;
const TYPEFACE_VARIABLE = /variable: "--(?<name>typeface-[\w-]+)"/gu;
const NO_PRELOAD = /preload: false/u;
const TYPEFACE = /^typeface-/u;
// A font file as the production build serves it, and the `.p` segment
// next/font adds to a preloaded font's name.
const BUILT_FONT_URL = /^\/_next\/static\/media\/[\w.-]+\.woff2$/u;
const PRELOADED_FILE = /\.p\./u;
// The next/font modules theme-fonts.ts imports from.
const FONT_MODULE = /from "(?<module>next\/font\/[\w-]+)"/gu;
// Each font's file, as in `src: "./fonts/nunito/nunito-latin-wght-normal.woff2"`.
const FONT_SRC = /src: "(?<path>\.\/fonts\/[\w-]+\/[\w.-]+\.woff2)"/gu;

// The font files and licences in the repo; only the keys are used.
const FONT_FILES = new Set(
  Object.keys(import.meta.glob("./fonts/*/*.woff2", { base: "/src/themes" })),
);
const LICENCES = new Set(
  Object.keys(import.meta.glob("./fonts/*/OFL.txt", { base: "/src/themes" })),
);

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

test("no font preloads through next/font", () => {
  expect(FONTS.length).toBeGreaterThan(0);
  expect(FONTS.filter(({ typeface }) => typeface === "")).toEqual([]);
  expect(FONTS.filter(({ preloads }) => preloads)).toEqual([]);
});

test("every theme's typefaces have a preload URL", () => {
  for (const { id } of THEMES) {
    expect(new Set(THEME_TYPEFACES[id])).toEqual(
      new Set([...themeReads(id)].filter((name) => TYPEFACE.test(name))),
    );
  }

  const urls = FONTS.map(
    ({ typeface }) => TYPEFACE_FONT_URLS[typeface] ?? `none for ${typeface}`,
  );
  expect(urls.filter((url) => !BUILT_FONT_URL.test(url))).toEqual([]);
  expect(urls.filter((url) => PRELOADED_FILE.test(url))).toEqual([]);
  expect(new Set(urls).size).toBe(FONTS.length);
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
