// How src/themes/theme-font-urls.ts has drifted from the production build:
// the check `npm run check:build-fonts` (check-build-font-urls.ts) runs on
// the CSS that `npm run build` writes under `.next/static/`. The map is in
// step when each typeface's URL is the `src` of a built `@font-face` rule
// for the family the built CSS gives its variable, and every `.woff2` file
// a built `@font-face` rule loads is in the map.
import { TYPEFACE_FONT_URLS } from "../src/themes/theme-font-urls.ts";

// A built stylesheet: its path under `.next/static/`, and its text.
interface BuiltSheet {
  readonly path: string;
  readonly text: string;
}

// A built `@font-face` rule: its family, and the pathnames of the files
// its `src` loads, as the site serves them.
interface FontFace {
  readonly family: string;
  readonly urls: readonly string[];
}

const FONT_FACE_RULE = /@font-face\s*\{(?<body>[^}]*)\}/gu;
const FONT_FAMILY = /font-family\s*:\s*(?<family>[^;]+)/u;
const SRC_URL = /url\(\s*["']?(?<url>[^"')]+)["']?\s*\)/gu;
const TYPEFACE_VARIABLE = /--(?<name>typeface-[\w-]+)\s*:\s*(?<value>[^;}]+)/gu;
const ENCLOSING_QUOTES = /^["']|["']$/gu;
const WOFF2 = /\.woff2$/u;
// Where the site serves `.next/static/`.
const STATIC_PREFIX = "/_next/static/";
// An origin to resolve the built CSS's relative URLs against.
const SITE = "https://site.invalid";

// A family name without its quotes.
function familyName(text: string): string {
  return text.trim().replaceAll(ENCLOSING_QUOTES, "");
}

// The family an `@font-face` rule's body declares.
function familyOf(body: string): string {
  const { groups: { family = "" } = {} } = FONT_FAMILY.exec(body) ?? {};
  return familyName(family);
}

// The `@font-face` rules of a sheet, with each URL resolved against the
// path the site serves the sheet at.
function fontFaces({ path, text }: BuiltSheet): FontFace[] {
  const sheetUrl = `${SITE}${STATIC_PREFIX}${path}`;
  return [...text.matchAll(FONT_FACE_RULE)].map(
    ({ groups: { body = "" } = {} }) => ({
      family: familyOf(body),
      urls: [...body.matchAll(SRC_URL)].map(
        ({ groups: { url = "" } = {} }) => new URL(url, sheetUrl).pathname,
      ),
    }),
  );
}

// The first family of each value the built CSS gives variable.
function variableFamilies(
  sheets: readonly BuiltSheet[],
  variable: string,
): string[] {
  return sheets.flatMap(({ text }) =>
    [...text.matchAll(TYPEFACE_VARIABLE)]
      .filter(({ groups: { name = "" } = {} }) => name === variable)
      .map(({ groups: { value = "" } = {} }) =>
        familyName(value.split(",")[0] ?? ""),
      ),
  );
}

// Why typeface's URL is not where the build loads its family from, or
// nothing if it is.
function typefaceDrift(
  sheets: readonly BuiltSheet[],
  faces: readonly FontFace[],
  [typeface, url]: readonly [string, string],
): string[] {
  const families = variableFamilies(sheets, typeface);
  if (families.length === 0) {
    return [`--${typeface} is set nowhere in the built CSS`];
  }
  const built = faces
    .filter(({ family }) => families.includes(family))
    .flatMap(({ urls }) => urls);
  if (built.includes(url)) {
    return [];
  }
  return [
    `${typeface}: the map's ${url} is not what the build loads for ${families.join(" or ")} (${built.join(", ") || "no @font-face file"})`,
  ];
}

// Each way the map differs from the built CSS, or none when it is in step.
function buildFontUrlDrift(sheets: readonly BuiltSheet[]): readonly string[] {
  const faces = sheets.flatMap(fontFaces);
  if (faces.length === 0) {
    return ["The built CSS has no @font-face rules: run `npm run build` first"];
  }
  const mapped = Object.values(TYPEFACE_FONT_URLS);
  const unmapped = [
    ...new Set(
      faces.flatMap(({ urls }) => urls).filter((url) => WOFF2.test(url)),
    ),
  ]
    .filter((url) => !mapped.includes(url))
    .map((url) => `${url} is a built @font-face file the map lacks`);
  return [
    ...Object.entries(TYPEFACE_FONT_URLS).flatMap((entry) =>
      typefaceDrift(sheets, faces, entry),
    ),
    ...unmapped,
  ];
}

export type { BuiltSheet };
export { buildFontUrlDrift };
