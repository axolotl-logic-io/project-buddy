// Where the production build serves each theme's font files, for the proxy's
// preload hints (src/proxy.ts). next/font leaves preloading off for each
// self-hosted font. The proxy reads the appearance cookie and sends a Link
// header so the browser starts loading the appropriate fonts with the page.
//
// The proxy imports this module, so it is plain runtime code: no Vite, no
// import.meta.glob, no filesystem.
//
// REGENERATING THE MAP, after changing a font file, a localFont call's
// options, or Next's version: run `npm run build` (Turbopack), then read each
// `@font-face` rule's `src` in the built CSS under `.next/static/`, e.g.
//   grep -oh "@font-face{[^}]*}" .next/static/chunks/*.css | sort -u
// The CSS's `../media/<file>.woff2` is `/_next/static/media/<file>.woff2`.
// Turbopack names a file `<name>-s.<content hash>.woff2`; a preloaded font
// would get a `.p` segment too, which theme-fonts.test.ts rejects. After a
// build, `npm run check:build-fonts` (scripts/check-build-font-urls.ts)
// fails if this map drifts from the build's `@font-face` URLs, and prints
// each difference; `npm run test:e2e` runs it on the build it tests.
//
import type { ThemeId } from "@/themes/themes.ts";

// Each typeface's font file, keyed by the variable theme-fonts.ts sets,
// without "--".
const TYPEFACE_FONT_URLS: Readonly<Record<string, string>> = {
  "typeface-im-fell-english":
    "/_next/static/media/im_fell_english_latin_400_normal-s.19q4vxlgtk0rb.woff2",
  "typeface-im-fell-english-italic":
    "/_next/static/media/im_fell_english_latin_400_italic-s.1y9qe_7x2ofb7.woff2",
  "typeface-cormorant-garamond":
    "/_next/static/media/cormorant_garamond_latin_wght_normal-s.0jvcp-grhfvvq.woff2",
  "typeface-unifrakturmaguntia":
    "/_next/static/media/unifrakturmaguntia_latin_400_normal-s.149sar0gtc4by.woff2",
  "typeface-source-serif-4":
    "/_next/static/media/source_serif_4_latin_wght_normal-s.2bbm7w9b-e07f.woff2",
  "typeface-nunito":
    "/_next/static/media/nunito_latin_wght_normal-s.1wzrasd95pxo_.woff2",
  "typeface-jetbrains-mono":
    "/_next/static/media/jetbrains_mono_latin_wght_normal-s.2rmhnsrc80fag.woff2",
};

// The typefaces each theme's CSS reads (src/themes/<id>.css).
// theme-fonts.test.ts checks this against the CSS.
const THEME_TYPEFACES: Readonly<Record<ThemeId, readonly string[]>> = {
  parchment: [
    "typeface-im-fell-english",
    "typeface-im-fell-english-italic",
    "typeface-cormorant-garamond",
    "typeface-unifrakturmaguntia",
    "typeface-source-serif-4",
    "typeface-nunito",
    "typeface-jetbrains-mono",
  ],
};

export { THEME_TYPEFACES, TYPEFACE_FONT_URLS };
