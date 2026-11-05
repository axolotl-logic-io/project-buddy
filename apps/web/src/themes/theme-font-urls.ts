// Where the production build serves each theme's font files, for the proxy's
// preload hints (src/proxy.ts). next/font preloads no font (every localFont
// call in theme-fonts.ts has `preload: false`), because its preloads go in
// the HTML every visitor shares and so could only name the default theme's
// fonts. Instead the proxy reads the theme cookie and sends a `Link` header
// naming the saved theme's fonts, and the HTML stays the same for everyone.
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
// Rejected (2026-10-14, issue #124):
// (a) reading the `.next` manifests at runtime: next/font's manifest lists
//     only preloaded fonts, which is none, and it would tie the proxy to
//     build internals and the filesystem;
// (b) keeping next/font's own preload: it preloads in the shared HTML, so
//     every visitor would also get the default theme's fonts;
// (c) preloading every theme's fonts: most visitors would download fonts
//     their theme never shows;
// (d) choosing preloads in the pre-paint script: ruled out by the maintainer;
// (e) cookies() in the layout: the pages would lose their prerendered shells.
import type { ThemeId } from "@/themes/themes.ts";

// Each typeface's font file, keyed by the variable theme-fonts.ts sets,
// without "--".
const TYPEFACE_FONT_URLS: Readonly<Record<string, string>> = {
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
    "typeface-source-serif-4",
    "typeface-nunito",
    "typeface-jetbrains-mono",
  ],
};

export { THEME_TYPEFACES, TYPEFACE_FONT_URLS };
